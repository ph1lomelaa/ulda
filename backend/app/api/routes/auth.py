from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.refresh_session import RefreshSession
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageResponse, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
    verify_password,
)


router = APIRouter()


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain or None,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        domain=settings.cookie_domain or None,
        path="/",
    )


def _build_token_response(user: User) -> TokenResponse:
    access_token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserRead.model_validate(user),
    )


def _create_refresh_session(user: User, db: Session) -> str:
    refresh_token = generate_refresh_token()
    session = RefreshSession(
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=refresh_token_expiry(),
    )
    db.add(session)
    db.commit()
    return refresh_token


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        name=payload.name.strip(),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    refresh_token = _create_refresh_session(user, db)
    _set_refresh_cookie(response, refresh_token)
    return _build_token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    refresh_token = _create_refresh_session(user, db)
    _set_refresh_cookie(response, refresh_token)
    return _build_token_response(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    token_hash = hash_refresh_token(refresh_token)
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_hash))
    if session is None or session.revoked_at is not None or session.expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    session.revoked_at = datetime.now(UTC)
    new_refresh_token = _create_refresh_session(user, db)
    _set_refresh_cookie(response, new_refresh_token)
    return _build_token_response(user)


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> MessageResponse:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)
        session = db.scalar(select(RefreshSession).where(RefreshSession.token_hash == token_hash))
        if session is not None and session.revoked_at is None:
            session.revoked_at = datetime.now(UTC)
            db.commit()

    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
