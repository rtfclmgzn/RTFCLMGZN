# RTFCLMGZN Project State Checkpoint

**Checkpoint date:** 2026-07-13  
**Authority:** User-confirmed session state

## Last confirmed production state

- The GitHub repository and Cloudflare Pages deployment are active.
- The custom domain `rtfclmgzn.com` loads the site.
- The fresh-article update was pushed successfully to `main`.
- The user subsequently confirmed that three new articles were visible on the live site.

## Explicitly NOT installed, run, pushed, or deployed

The user confirmed that, after the package-generation responses, they did **not** run scripts or push any of the following pending work:

1. `RTFCLMGZN_RELEASE_MANAGER_V1.zip`
2. `RTFCLMGZN_NEWSROOM_CORE_V0_1.zip`
3. `RTFCLMGZN_MORNING_DEPLOY_PACK_2026-07-13.zip`
4. The three-story editorial release contained in the phone-sprint/morning-deploy materials
5. Any Newsroom Studio v0.2 implementation beyond the supplied mockup/specification

Therefore none of those items may be assumed to exist in the local repository, GitHub, Cloudflare, or production website.

## Development rule from this checkpoint

All subsequent cloud-side work must:

- build from the last confirmed live code state;
- treat the Release Manager, Newsroom Core, and Morning Deploy Pack as uninstalled drafts;
- avoid stacking additional installers on top of an assumed local installation;
- consolidate overlapping pending packages before asking the user to run anything;
- keep platform installation separate from editorial publication approval;
- never claim a GitHub push, Cloudflare deployment, local installation, or live publication unless the user confirms it or verifiable evidence is available.

## Next implementation objective

Create one consolidated, idempotent platform package that installs or upgrades:

- the canonical architecture documents;
- the 26-agent registry and 9 personas;
- the deterministic 12-checkpoint Newsroom Core;
- the local private Newsroom Studio;
- the Release Manager;
- repository safety and truthful public-language fixes.

The pending editorial release remains a separate, owner-approved action and must not publish automatically during platform installation.
