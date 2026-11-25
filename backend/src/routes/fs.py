"""知识库目录扫描：按目录树导入知识地图。

仅允许访问 KNOWLEDGE_ROOT 内的目录，避免越权读取服务器文件系统。
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from config.settings import settings
from utils.response import success_response

fs_router = APIRouter(prefix="/fs", tags=["Filesystem"])

MAX_DEPTH = 20
MAX_MD_BYTES = 256 * 1024
SKIP_DIRS = {"node_modules", "__pycache__", ".git", ".venv", "dist", "build"}


def _root() -> Path:
    root = Path(settings.KNOWLEDGE_ROOT).expanduser().resolve()
    if not root.is_dir():
        raise HTTPException(status_code=404, detail=f"知识库根目录不存在: {settings.KNOWLEDGE_ROOT}")
    return root


def _resolve(relative: str) -> Path:
    root = _root()
    target = (root / (relative or "")).resolve()
    if target != root and root not in target.parents:
        raise HTTPException(status_code=403, detail="仅允许访问知识库根目录内的路径")
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="目录不存在")
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
        if item.is_file()
        and not item.is_symlink()
        and item.suffix.lower() == ".md"
    ]


@fs_router.get("/dirs")
async def list_directories(path: str = Query("", description="相对知识库根目录的路径")):
    root = _root()
    base = _resolve(path)
    directories = [
        {
            "name": child.name,
            "path": _relative(child, root),
            "hasChildren": bool(_visible_dirs(child)),
            "mdCount": len(_md_files(child)),
        }
        for child in _visible_dirs(base)
    ]
    return success_response(
        data={
            "rootName": root.name,
            "path": _relative(base, root),
            "name": base.name,
            "parent": None if base == root else _relative(base.parent, root),
            "dirs": directories,
            "mdCount": len(_md_files(base)),
        }
    )


def _scan(directory: Path, root: Path, depth: int) -> dict:
    props = []
    for md_file in _md_files(directory):
        try:
            content = md_file.read_text(encoding="utf-8", errors="replace")[:MAX_MD_BYTES]
        except OSError:
            content = ""
        props.append(
            {
                "label": md_file.stem,
                "path": _relative(md_file, root),
                "content": content,
            }
        )
    children = []
    if depth < MAX_DEPTH:
        children = [_scan(child, root, depth + 1) for child in _visible_dirs(directory)]
    return {
        "name": directory.name,
        "path": _relative(directory, root),
        "props": props,
        "children": children,
    }


@fs_router.get("/tree")
async def directory_tree(path: str = Query("", description="相对知识库根目录的路径")):
    root = _root()
    base = _resolve(path)
    return success_response(data=_scan(base, root, 0))
