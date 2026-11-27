"""统一分页模型：{total, items}（评审 P3）。"""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    total: int = 0
    items: list[T] = []
