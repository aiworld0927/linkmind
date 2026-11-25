from __future__ import annotations

from pathlib import Path

import pytest

from services.git_registry_service import resolve_repo_path, validate_repo_name
from utils.errors import GitError


def test_resolve_repo_path_accepts_nested_directory(tmp_path: Path):
    root = tmp_path / "knowledge"
    target = root / "docs" / "notes"
    target.mkdir(parents=True)
    assert resolve_repo_path("docs/notes", root) == target.resolve()


def test_resolve_repo_path_accepts_root(tmp_path: Path):
    root = tmp_path / "knowledge"
    root.mkdir()
    assert resolve_repo_path("", root) == root.resolve()


@pytest.mark.parametrize("value", ["../outside", "docs/../../outside", "/tmp", "a/../../b"])
def test_resolve_repo_path_rejects_escape(tmp_path: Path, value: str):
    root = tmp_path / "knowledge"
    root.mkdir()
    with pytest.raises(GitError, match="越界"):
        resolve_repo_path(value, root)


def test_validate_repo_name():
    assert validate_repo_name("  知识仓库 ") == "知识仓库"
    with pytest.raises(GitError, match="不能为空"):
        validate_repo_name("   ")
    with pytest.raises(GitError, match="120"):
        validate_repo_name("x" * 121)
