from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from services.git_service import GitService
from utils.errors import ConflictError, GitError
from tests.conftest import make_repo, run_git


def test_init_creates_repo_and_initial_commit(tmp_path: Path):
    repo = make_repo(tmp_path / "repo", {"README.md": "hello\n"})
    assert repo.is_repo()
    commits = repo.log()
    assert len(commits) == 1
    assert commits[0].subject == "初始化知识仓库"


def test_status_tracks_modified_and_untracked(repo: GitService):
    (repo.repo_path / "README.md").write_text("changed\n", encoding="utf-8")
    (repo.repo_path / "new.md").write_text("new\n", encoding="utf-8")

    status = repo.status()
    states = {item.path: item.state for item in status.files}
    assert states["README.md"] == "modified"
    assert states["new.md"] == "untracked"


def test_commit_selected_paths_only(repo: GitService):
    (repo.repo_path / "README.md").write_text("changed\n", encoding="utf-8")
    (repo.repo_path / "new.md").write_text("new\n", encoding="utf-8")

    message = repo.commit("更新 README", ["README.md"], all_changes=False)
    assert message == "提交完成"
    status = repo.status()
    assert [item.path for item in status.files] == ["new.md"]
    assert repo.log()[0].subject == "更新 README"


def _prepare_divergent_repos(tmp_path: Path) -> tuple[GitService, GitService, Path]:
    remote = tmp_path / "remote.git"
    remote.mkdir()
    run_git(remote, "init", "--bare", "--initial-branch=main")

    first = make_repo(tmp_path / "first", {"README.md": "base\n"})
    run_git(first.repo_path, "remote", "add", "origin", str(remote))
    run_git(first.repo_path, "push", "-u", "origin", "main")

    second_path = tmp_path / "second"
    subprocess.run(
        ["git", "clone", str(remote), str(second_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    second = GitService(second_path)

    (first.repo_path / "README.md").write_text("from first\n", encoding="utf-8")
    first.commit("first change", None, all_changes=True)
    first.push()

    (second.repo_path / "README.md").write_text("from second\n", encoding="utf-8")
    second.commit("second change", None, all_changes=True)
    return first, second, remote


def test_pull_conflict_resolve_ours_and_continue(tmp_path: Path):
    _, second, _ = _prepare_divergent_repos(tmp_path)

    message = second.pull()
    assert "冲突" in message
    status = second.status()
    assert status.merging
    assert [item.path for item in status.conflicts] == ["README.md"]

    conflicts = second.conflicts()
    assert "from first" in conflicts[0].theirs
    assert "from second" in conflicts[0].ours

    assert "本地" in second.resolve_conflict("README.md", "ours", None)
    assert second.status().conflicts == []

    second.continue_merge()
    final_status = second.status()
    assert not final_status.merging
    assert (second.repo_path / "README.md").read_text(encoding="utf-8") == "from second\n"


def test_abort_merge_restores_branch(tmp_path: Path):
    _, second, _ = _prepare_divergent_repos(tmp_path)
    second.pull()
    assert second.status().merging

    second.abort_merge()
    assert not second.status().merging
    assert (second.repo_path / "README.md").read_text(encoding="utf-8") == "from second\n"


def test_push_updates_remote(tmp_path: Path):
    remote = tmp_path / "remote.git"
    remote.mkdir()
    run_git(remote, "init", "--bare", "--initial-branch=main")

    repo = make_repo(tmp_path / "repo")
    run_git(repo.repo_path, "remote", "add", "origin", str(remote))
    run_git(repo.repo_path, "push", "-u", "origin", "main")

    (repo.repo_path / "README.md").write_text("v2\n", encoding="utf-8")
    repo.commit("v2", None, all_changes=True)
    assert repo.push() == "推送完成"

    output = run_git(remote, "log", "--oneline", "main").stdout
    assert "v2" in output


def test_commit_rejects_without_changes(repo: GitService):
    with pytest.raises(GitError, match="没有可提交的变更"):
        repo.commit("empty", None, all_changes=True)


def test_push_without_upstream_is_rejected(repo: GitService):
    with pytest.raises(GitError, match="上游分支"):
        repo.push()


def test_resolve_custom_content(tmp_path: Path):
    _, second, _ = _prepare_divergent_repos(tmp_path)
    second.pull()
    second.resolve_conflict("README.md", "content", "merged\n")
    second.continue_merge()
    assert (second.repo_path / "README.md").read_text(encoding="utf-8") == "merged\n"


def test_pull_conflict_is_not_raised_as_error(tmp_path: Path):
    _, second, _ = _prepare_divergent_repos(tmp_path)
    try:
        second.pull()
    except ConflictError:
        pytest.fail("拉取冲突应返回状态而非抛出冲突异常")
