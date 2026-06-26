from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from utils.response import error_response


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_detail = exc.errors()[0].get("msg", "Validation error")
    return JSONResponse(
        status_code=400,
        content=error_response(code=400, msg=error_detail),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(code=exc.status_code, msg=exc.detail),
    )


async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content=error_response(code=500, msg=str(exc)),
    )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, global_exception_handler)