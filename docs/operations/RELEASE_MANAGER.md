# Editorial Release Manager

The Release Manager is the controlled bridge between a release package produced in ChatGPT and the production website.

## Owner workflow

1. Download the `RTFCLMGZN_release_*.zip` package produced for a publishing run.
2. Double-click `RTFCLMGZN_RELEASE_MANAGER.bat` in the project root.
3. Drop the release ZIP into the local dashboard.
4. Review the article inventory and press **Publish to rtfclmgzn.com**.
5. Approve the final owner gate.

The manager then performs the full release operation:

- verifies the package manifest and SHA-256 inventory;
- rejects path traversal, undeclared files, unsafe content paths, and executable browser behavior;
- requires a clean `main` branch and synchronizes a behind-only local checkout;
- backs up every replaced file outside the Git repository;
- installs content and media files atomically;
- increments every `?b=N` browser cache marker in `web/index.html`;
- verifies article IDs, slugs, images, XML feeds, data-file structure, and duplicate routes;
- creates `web/release.json` as a deployment marker;
- records the release under `docs/operations/releases/`;
- commits only the approved release files;
- pushes `main` to GitHub; and
- polls `rtfclmgzn.com/release.json` until Cloudflare serves the matching release.

## Authority boundary

The tool never publishes on a timer and never runs in the background. Every release requires an explicit owner confirmation in the local dashboard.

## Release package contract

A valid ZIP contains:

```text
release.json
payload/
  web/data/live-articles.js
  web/data/social-posts.js
  web/rss.xml
  web/assets/img/...
```

`release.json` uses schema version 1 and includes release metadata, article summaries, and a SHA-256/size record for every payload file. The formal schema lives at:

```text
tools/release_manager/release-package.schema.json
```

## Recovery

Before applying a release, the manager creates a ZIP backup in the current Windows user's local application-data directory:

```text
%LOCALAPPDATA%\RTFCLMGZN\release-manager\backups\
```

If validation fails before publication, it resets the staging area and restores the local project automatically. If GitHub accepts a commit but Cloudflare confirmation times out, the commit remains valid and the dashboard reports that deployment confirmation is still pending.
