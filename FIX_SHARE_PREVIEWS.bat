@echo off
setlocal
title RTFCLMGZN - ship social polish (v3)
cd /d "%~dp0"
echo [1/5] Committing tonight's social polish...
git add -A "functions/share/[slug].js" web\data\social-posts.js agents\social\post_social.py agents\social\social-posting.agent.md newsroom\runner\cycle-runbook.md RTFCLMGZN_SOCIAL_DISPATCH.bat FIX_SHARE_PREVIEWS.bat
git commit -m "social polish: portrait crops for FB/IG/Threads previews, IG portrait-first upload, hashtag engine, narrated dispatcher, runbook 4c portrait staging"
echo [2/5] Stashing anything else so the pull can never refuse...
git stash push -u -m pre-fix-leftovers
echo [3/5] Pulling latest...
git pull --rebase origin main
if errorlevel 1 (
  echo PULL FAILED - tell Claude, nothing was lost. Your stash: pre-fix-leftovers
  git rebase --abort >nul 2>nul
  pause
  exit /b 1
)
echo [4/5] Pushing (sign in as rtfclmgzn if a window appears)...
git push origin main
if errorlevel 1 (
  echo PUSH FAILED - read the lines above and tell Claude what they say.
  pause
  exit /b 1
)
echo [5/5] Restoring your stashed leftovers...
git stash pop
echo.
echo SUCCESS - Cloudflare redeploys in about 2 minutes.
pause
