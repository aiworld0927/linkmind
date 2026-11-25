from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest

from services.git_service import GitService


@pytest.fixture(autouse=True)
def isolated_git_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """隔离 Git 全局配置与 HOME，避免依赖开发机配置。"""

    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", os.devnull)
    monkeypatch.setenv("GIT_TERMINAL_PROMPT", "0")
    monkeypatch.setenv("GIT_AUTHOR_NAME", "Test")
    monkeypatch.setenv("GIT_AUTHOR_EMAIL", "test@example.com")
    monkeypatch.setenv("GIT_COMMITTER_NAME", "Test")
    monkeypatch.setenv("GIT_COMMITTER_EMAIL", "test@example.com")
    yield


def run_git(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=True,
        env=os.environ.copy(),
    )


def make_repo(path: Path, files: dict[str, str] | None = None) -> GitService:
    path.mkdir(parents=True, exist_ok=True)
    for name, content in (files or {"README.md": "hello\n"}).items():
        target = path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    service = GitService(path)
    service.init()
    return service


def make_remote(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    run_git(path, "init", "--bare", "--initial-branch=main")
    return path


@pytest.fixture
def repo(tmp_path: Path) -> GitService:
    return make_repo(tmp_path / "repo")


@pytest.fixture
def remote(tmp_path: Path) -> Path:
    return make_remote(tmp_path / "remote.git")
