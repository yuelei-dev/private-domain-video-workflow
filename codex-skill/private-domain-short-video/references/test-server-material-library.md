# Huangque test-server material library

Use this mode when the user has not supplied footage or explicitly asks to use the Huangque material library.

## Fixed source

- Server role: Huangque test server only
- SSH target: `ubuntu@8.148.158.106`
- Read-only root: `/home/ubuntu/material-libraries/huangque-media/`
- Production servers are never a fallback source.

Authentication must come from an already configured SSH agent or SSH config. Never place a password, private key, bearer token, or copied credential in a command, Skill file, Git repository, log, or evidence package.

## List and stage

List the catalog without copying files:

```powershell
python scripts/test_server_materials.py list --limit 300
```

Stage selected files into the current task workspace:

```powershell
python scripts/test_server_materials.py fetch --output-dir "E:\AI\工作区\当前任务\assets\source" --path "分类/素材.mp4"
```

The helper first uses the fixed directory directly when it is running on the test server. Otherwise it uses non-interactive SSH. It rejects absolute paths, traversal, symlinks, unsupported extensions, and anything outside the fixed root. `fetch` copies from the server to the task workspace; it never writes, moves, renames, or deletes server material.

If authentication is unavailable, stop with a clear SSH-agent/config blocker. Do not retry passwords and do not switch to production. If the catalog is reachable but has no suitable proof-oriented footage, request user footage instead of using unrelated web stock.

## Provenance

For each selected file, write its library-relative path, size, and staged SHA-256 to `SOURCES.md`. Do not expose the full server path in published video metadata.
