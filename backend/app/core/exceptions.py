"""统一业务异常与全局异常处理。

所有错误响应均为 ``{code, msg, data: None}``；service 层只抛业务异常，
不直接依赖 HTTP 细节（错误码映射见 docs/15 4.2）。
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppException(Exception):
    """业务异常基类：code 即 HTTP 状态码（body.code 与之一致）。"""

    def __init__(self, msg: str, code: int = 400) -> None:
        super().__init__(msg)
        self.msg = msg
        self.code = code


class BadRequestError(AppException):
    """业务规则错误（含重名/冲突/非法参数，统一 400）。"""

    def __init__(self, msg: str) -> None:
        super().__init__(msg, code=400)


class NotFoundError(AppException):
    def __init__(self, msg: str) -> None:
        super().__init__(msg, code=404)


class ForbiddenError(AppException):
    def __init__(self, msg: str) -> None:
        super().__init__(msg, code=403)


def _payload(code: int, msg: str) -> dict:
    return {"code": code, "msg": msg, "data": None}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(status_code=exc.code, content=_payload(exc.code, exc.msg))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        first = errors[0] if errors else {}
        loc = ".".join(str(item) for item in first.get("loc", []) if item not in ("body", "query", "path"))
        msg = first.get("msg", "参数校验失败")
        if loc:
            msg = f"{loc}: {msg}"
        return JSONResponse(status_code=422, content=_payload(422, msg))

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        detail = exc.detail if isinstance(exc.detail, str) else "请求错误"
        return JSONResponse(status_code=exc.status_code, content=_payload(exc.status_code, detail))

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("未处理异常: %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content=_payload(500, "服务器内部错误"))
