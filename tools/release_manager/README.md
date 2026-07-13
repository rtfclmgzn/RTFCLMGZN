# RTFCLMGZN Editorial Release Manager v1.2

A dependency-free local publishing control plane for the current static publication architecture.

## Runtime

- Python 3.10 or later
- Git for Windows
- Existing authenticated `origin` remote
- No third-party Python packages

The launcher starts an HTTP service bound only to `127.0.0.1`, creates a cryptographically random per-launch token, and opens the dashboard in the default browser. Every API call requires that token.

## Owner gate

Uploading a package only validates and previews it. Publication requires a second confirmation dialog and an exact typed match of the release ID. The manager never watches folders, publishes on a timer, or runs as a background service.

## Commands

Open the browser dashboard:

```text
python tools/release_manager/release_manager.py
```

Inspect a package without changing the repository:

```text
python tools/release_manager/release_manager.py --inspect path\to\release.zip
```

Publish from the command line with an interactive confirmation:

```text
python tools/release_manager/release_manager.py --publish path\to\release.zip
```

Build a package from a release specification:

```text
python tools/release_manager/build_release.py --project . --spec release-spec.json --output release.zip
```

## Design constraints

- Editorial packages cannot modify application code, Cloudflare Functions, secrets, Git configuration, or repository tooling.
- Every package file must be declared with its exact byte size and SHA-256 checksum.
- `web/index.html` is changed only by the manager's deterministic cache-bump operation.
- Production publishing is restricted to a clean, synchronized `main` branch.
- The exact staged-file set is compared with the approved inventory before commit.
- Backups are stored outside Git.
- Deployment confirmation uses a release-specific marker rather than browser cache behavior.
