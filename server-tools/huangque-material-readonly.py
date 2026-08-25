#!/usr/bin/env python3
"""Forced SSH command that exposes only read operations for Huangque media."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path, PurePosixPath
import sys

ROOT = Path("/home/ubuntu/material-libraries/huangque-media")
ALLOWED_EXTENSIONS = {
    ".mp4", ".mov", ".m4v", ".webm",
    ".jpg", ".jpeg", ".png", ".webp",
    ".mp3", ".m4a", ".wav", ".aac", ".flac", ".ogg",
}


def safe_file(encoded: str) -> tuple[Path, str]:
    relative_text = base64.urlsafe_b64decode(encoded.encode("ascii")).decode("utf-8")
    relative = PurePosixPath(relative_text)
    if (
        not relative_text
        or "\\" in relative_text
        or "//" in relative_text
        or relative.is_absolute()
        or any(part in {"", ".", ".."} for part in relative.parts)
        or relative.suffix.lower() not in ALLOWED_EXTENSIONS
    ):
        raise ValueError("invalid material path")
    root = ROOT.resolve(strict=True)
    unresolved = root / Path(*relative.parts)
    if path_contains_symlink(root, unresolved):
        raise ValueError("symlink material is not allowed")
    target = unresolved.resolve(strict=True)
    if root not in target.parents or not target.is_file():
        raise ValueError("material is outside the library")
    return target, relative.as_posix()


def path_contains_symlink(root: Path, target: Path) -> bool:
    cursor = root
    for part in target.relative_to(root).parts:
        cursor /= part
        if cursor.is_symlink():
            return True
    return False


def list_materials(limit_text: str) -> None:
    limit = int(limit_text)
    if limit < 1 or limit > 5000:
        raise ValueError("invalid limit")
    root = ROOT.resolve(strict=True)
    items = []
    for path in sorted(root.rglob("*"), key=lambda item: str(item).casefold()):
        if len(items) >= limit:
            break
        if path.is_symlink() or not path.is_file() or path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        target = path.resolve(strict=True)
        if root not in target.parents:
            continue
        items.append({"path": target.relative_to(root).as_posix(), "size": target.stat().st_size})
    print(json.dumps({"root": "huangque-media", "items": items}, ensure_ascii=False))


def fetch_material(encoded: str) -> None:
    target, _ = safe_file(encoded)
    with target.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            sys.stdout.buffer.write(chunk)


def main() -> int:
    command = os.environ.get("SSH_ORIGINAL_COMMAND", "").split()
    try:
        if len(command) == 2 and command[0] == "list":
            list_materials(command[1])
        elif len(command) == 2 and command[0] == "fetch":
            fetch_material(command[1])
        else:
            raise ValueError("unsupported command")
        return 0
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError):
        print("material request rejected", file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
