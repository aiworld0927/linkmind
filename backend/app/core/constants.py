"""常量与错误码：HTTP 状态码与 body.code 一一对应（评审 P7）。"""

from enum import IntEnum


class ErrorCode(IntEnum):
    OK = 200
    BAD_REQUEST = 400
    NOT_FOUND = 404
    FORBIDDEN = 403
    VALIDATION_ERROR = 422
    INTERNAL_ERROR = 500


# 前端虚拟根节点约定（types/index.ts L60）：不落库，等价于地图标题 / 地图级属性
NODE_ROOT_ID = "ROOT"
