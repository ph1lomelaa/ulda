from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def create_audit_log(
    *,
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    detail: str | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    )
    db.add(log)
    return log
