"""统一响应包装：``{code, msg, data}``，code===200 为成功（docs/15 4.2）。"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    msg: str = "success"
    data: T | None = None


class RemovedOut(BaseModel):
    """删除类接口的通用响应体。"""

    removed: bool = True


def ok(data: T | None = None, msg: str = "success") -> ApiResponse[T]:
    return ApiResponse(code=200, msg=msg, data=data)
