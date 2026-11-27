"""知识库目录扫描业务逻辑（迁自旧 src/routes/fs.py）。

仅允许访问 KNOWLEDGE_ROOT 内的目录，避免越权读取服务器文件系统。
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from app.api.v1.fs.schemas import (
    DocContentOut,
    FsDirEntryOut,
    FsDirListingOut,
    FsTreeNodeOut,
    FsTreeNodePropOut,
)
from app.core.config import settings
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError

MAX_DEPTH = 20
MAX_MD_BYTES = 256 * 1024
MAX_DOC_BYTES = 10 * 1024 * 1024
SKIP_DIRS = {"node_modules", "__pycache__", ".git", ".venv", "dist", "build"}


def _root() -> Path:
    root = Path(settings.KNOWLEDGE_ROOT).expanduser().resolve()
    if not root.is_dir():
        raise NotFoundError(f"知识库根目录不存在: {settings.KNOWLEDGE_ROOT}")
    return root


def _resolve(relative: str) -> Path:
    root = _root()
    target = (root / (relative or "")).resolve()
    if target != root and root not in target.parents:
        raise ForbiddenError("仅允许访问知识库根目录内的路径")
    if not target.is_dir():
        raise NotFoundError("目录不存在")
    return target


def _resolve_file(relative: str) -> Path:
    root = _root()
    target = (root / (relative or "")).resolve()
    if target != root and root not in target.parents:
        raise ForbiddenError("仅允许访问知识库根目录内的路径")
    if not target.is_file():
        raise NotFoundError("文档不存在")
    return target


def _relative(path: Path, root: Path) -> str:
    return "" if path == root else path.relative_to(root).as_posix()


def _visible_dirs(directory: Path) -> list[Path]:
    try:
        entries = sorted(directory.iterdir(), key=lambda item: item.name.lower())
    except OSError:
        return []
    return [
        item
        for item in entries
        if item.is_dir()
        and not item.is_symlink()
        and not item.name.startswith(".")
        and item.name not in SKIP_DIRS
    ]


def _md_files(directory: Path) -> list[Path]:
    try:
        entries = sorted(directory.iterdir(), key=lambda item: item.name.lower())
    except OSError:
        return []
    return [
        item
        for item in entries
        if item.is_file() and not item.is_symlink() and item.suffix.lower() == ".md"
    ]


# ------------------------------------------------------------------ B-1
async def list_dirs(path: str) -> FsDirListingOut:
    """列出知识库子目录。"""

    def _work() -> FsDirListingOut:
        root = _root()
        base = _resolve(path)
        dirs = [
            FsDirEntryOut(
                name=child.name,
                path=_relative(child, root),
                has_children=bool(_visible_dirs(child)),
                md_count=len(_md_files(child)),
            )
            for child in _visible_dirs(base)
        ]
        return FsDirListingOut(
            root_name=root.name,
            path=_relative(base, root),
            name=base.name,
            parent=None if base == root else _relative(base.parent, root),
            dirs=dirs,
            md_count=len(_md_files(base)),
        )

    return await asyncio.to_thread(_work)


# ------------------------------------------------------------------ B-2
def _scan(directory: Path, root: Path, depth: int) -> FsTreeNodeOut:
    props: list[FsTreeNodePropOut] = []
    for md_file in _md_files(directory):
        raw_len = 0
        content = ""
        truncated = False
        try:
            raw = md_file.read_bytes()
            raw_len = len(raw)
            data = raw[:MAX_MD_BYTES]
            truncated = raw_len > MAX_MD_BYTES
            content = data.decode("utf-8", errors="replace")
        except OSError:
            content = ""
        props.append(
            FsTreeNodePropOut(
                label=md_file.stem,
                content=content,
                path=_relative(md_file, root),
                doc=True,
                truncated=truncated,
                content_length=raw_len,
            )
        )
    children: list[FsTreeNodeOut] | None = None
    if depth < MAX_DEPTH:
        children = [_scan(child, root, depth + 1) for child in _visible_dirs(directory)]
    return FsTreeNodeOut(
        name=directory.name,
        path=_relative(directory, root),
        props=props,
        children=children,
    )


async def directory_tree(path: str) -> FsTreeNodeOut:
    """扫描目录生成知识树（递归）。"""

    def _work() -> FsTreeNodeOut:
        root = _root()
        base = _resolve(path)
        return _scan(base, root, 0)

    return await asyncio.to_thread(_work)


# ------------------------------------------------------------------ F-3
async def doc_content(path: str) -> DocContentOut:
    """读取文档全文（fs/tree 截断的兜底通道，Q2/P11）。"""

    def _work() -> DocContentOut:
        target = _resolve_file(path)
        data = target.read_bytes()[:MAX_DOC_BYTES]
        return DocContentOut(
            path=_relative(target, _root()),
            name=target.name,
            content=data.decode("utf-8", errors="replace"),
        )

    return await asyncio.to_thread(_work)


def check_path_guard(relative: str) -> None:
    """供 mindmap 导入复用的路径越权校验。"""
    _resolve(relative)


__all__ = [
    "list_dirs",
    "directory_tree",
    "doc_content",
    "check_path_guard",
    "BadRequestError",
]
