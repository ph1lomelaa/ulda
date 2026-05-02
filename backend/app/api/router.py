from fastapi import APIRouter

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router
from app.api.routes.sources import router as sources_router
from app.api.routes.system import router as system_router


api_router = APIRouter()
api_router.include_router(audit_router, prefix="/audit", tags=["audit"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(sources_router, prefix="/sources", tags=["sources"])
api_router.include_router(system_router, prefix="/system", tags=["system"])
