# 🚀 DEPLOY TONIGHT — the phone-friendly checklist
### Total time: ~15 minutes. Do it in order. Nothing here can break your computer or the site.

## Part 1 — Put the site online (~5 min)

1. Go to **dash.cloudflare.com** and log in.
2. Left sidebar → **Workers & Pages** → click **Create** → pick the **Pages** tab.
3. Click **Upload assets** (direct upload — NOT "connect to git" tonight).
4. Project name: `rtfclmgzn` → **Create project**.
5. Drag the **`web` folder** from `B:\BUSINESS\RTFCLMGZN\` into the upload box.
   ⚠️ Just the `web` folder — not the whole RTFCLMGZN folder (agents/PDFs stay private).
6. Click **Deploy site**. Wait ~2 minutes. You'll get a link like `rtfclmgzn.pages.dev` — **open it and click around.** It's live.

## Part 2 — Connect your domain (~3 min)

7. In the project → **Custom domains** tab → **Set up a custom domain**.
8. Type `rtfclmgzn.com` → Continue → Cloudflare auto-configures DNS (the domain is already on Cloudflare) → **Activate**.
9. Repeat for `www.rtfclmgzn.com` if offered.
10. Give it a few minutes, then open **https://rtfclmgzn.com** 🎉

## Part 3 — Switch on analytics (~2 min, free)

11. Project → **Metrics/Analytics** area → enable **Web Analytics** for the site
    (Cloudflare offers it right on the Pages project — one toggle, auto-injected,
    cookie-free). Done — traffic numbers start tonight.

## Part 4 — Turn on the newsroom (~1 min + one message)

12. Message Claude: **"we're live — enable the pipeline"**. I flip the scheduled task on.
13. When the app asks, click **"Run now"** once on the `rtfclmgzn-daily-pipeline` task —
    that first manual run pre-approves its tools. After that it's fully automatic:
    5 slots a day starting tomorrow 5:00 AM.
    ⚠️ Reminder: runs happen only while the Claude desktop app is open on this PC.

## Part 5 — Tell the world (whenever you're ready)

14. Open `B:\BUSINESS\RTFCLMGZN\LAUNCH-POSTS.md` — everything is copy-paste ready.
    (Tip inside: if it's past midnight, post tomorrow ~9am ET instead.)

## If something looks wrong
- Old/stale content showing → hard-refresh (Ctrl+F5). Still wrong → tell Claude "bump the cache version" and re-upload.
- Any page broken → screenshot it to Claude. The local copy is the source of truth; re-uploading `web` fixes the deploy.

## Future updates (after tonight)
Every content change = re-drag the `web` folder (2 min). When you're ready to stop
doing that, say **"set up GitHub auto-deploy"** — the repo files are already prepped
(README + .gitignore), it's a ~30-min one-time setup and then updates publish themselves.
