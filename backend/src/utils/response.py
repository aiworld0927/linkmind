from typing import Any, Optional


def success_response(data: Any = None, msg: str = "success") -> dict:
    return {"code": 200, "msg": msg, "data": data}


def error_response(code: int = 500, msg: str = "error", data: Any = None) -> dict:
    return {"code": code, "msg": msg, "data": data}