"""鉴权：OAuth2PasswordBearer + JWT；ALLOW_ANONYMOUS=true 时放行（docs/18 决策 3）。

不新增登录接口（文档外约束）；tokenUrl 仅作 OpenAPI 展示占位。
"""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import AppException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token", auto_error=False)


class CurrentUser(BaseModel):
    id: str = "anonymous"
    name: str = "anonymous"
    anonymous: bool = True


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    return jwt.encode(
        {"sub": subject, "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise AppException("无效的登录凭证", code=401) from exc
    subject = payload.get("sub")
    if not subject:
        raise AppException("无效的登录凭证", code=401)
    return subject


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> CurrentUser:
    """依赖注入 current_user；匿名开关打开时直接放行。"""
    if settings.ALLOW_ANONYMOUS:
        return CurrentUser()
    if not token:
        raise AppException("未认证：请提供 Bearer Token", code=401)
    subject = decode_token(token)
    return CurrentUser(id=subject, name=subject, anonymous=False)
