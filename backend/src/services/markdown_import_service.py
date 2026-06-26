import os
import re
from typing import List, Dict
from repositories.note_repository import create_note, get_note_by_hash, compute_hash


def parse_markdown(file_path: str) -> Dict:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    title = os.path.splitext(os.path.basename(file_path))[0]

    first_line = content.split("\n")[0].strip()
    if first_line.startswith("# "):
        title = first_line[2:].strip()

    return {"title": title, "content": content}


def parse_directory(directory_path: str) -> List[Dict]:
    notes = []
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                note = parse_markdown(file_path)
                note["file_path"] = file_path
                notes.append(note)
    return notes


async def import_markdown_files(file_paths: List[str]) -> Dict:
    results = {
        "created": 0,
        "duplicated": 0,
        "failed": 0,
        "items": [],
    }

    for file_path in file_paths:
        if not os.path.exists(file_path):
            results["failed"] += 1
            results["items"].append({
                "file_path": file_path,
                "status": "failed",
                "message": "File not found",
            })
            continue

        if os.path.isdir(file_path):
            dir_notes = parse_directory(file_path)
            for note in dir_notes:
                await _import_note_with_dedup(note, results)
        elif file_path.endswith(".md"):
            note = parse_markdown(file_path)
            await _import_note_with_dedup(note, results)
        else:
            results["failed"] += 1
            results["items"].append({
                "file_path": file_path,
                "status": "failed",
                "message": "Not a markdown file",
            })

    return results


async def _import_note_with_dedup(note: Dict, results: Dict):
    note_hash = compute_hash(note["title"], note["content"])
    existing_note = await get_note_by_hash(note_hash)

    if existing_note:
        results["duplicated"] += 1
        results["items"].append({
            "file_path": note.get("file_path", "unknown"),
            "status": "duplicated",
            "message": "Note already exists",
            "title": note["title"],
        })
    else:
        try:
            created_note = await create_note(note["title"], note["content"])
            results["created"] += 1
            results["items"].append({
                "file_path": note.get("file_path", "unknown"),
                "status": "created",
                "message": "Note created successfully",
                "title": note["title"],
                "id": created_note["id"],
            })
        except Exception as e:
            results["failed"] += 1
            results["items"].append({
                "file_path": note.get("file_path", "unknown"),
                "status": "failed",
                "message": str(e),
                "title": note["title"],
            })