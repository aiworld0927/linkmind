"""业务异常定义。

服务层只抛出业务异常，不依赖 FastAPI；由 middleware 统一转换为
``{code, msg, data}`` 结构，保证接口错误格式一致。
"""


class BusinessError(Exception):
    status_code: int = 400

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class GitError(BusinessError):
    """Git 操作失败（状态码在前，便于服务层直接指定）。"""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message, status_code)


class NotFoundError(BusinessError):
    status_code = 404


class ConflictError(BusinessError):
    status_code = 409
