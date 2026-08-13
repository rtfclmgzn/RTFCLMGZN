@echo off
setlocal
title RTFCLMGZN - fix Facebook link previews (v2)
cd /d "%~dp0"
echo [1/5] Committing the share-page fix + dispatch status updates...
git add -A "functions/share/[slug].js" web\data\social-posts.js agents\social\post_social.py agents\social\social-posting.agent.md RTFCLMGZN_SOCIAL_DISPATCH.bat FIX_SHARE_PREVIEWS.bat
git commit -m "share pages: JS-only redirect (FB was unfurling the homepage card); dispatcher: narrated output + hashtag engine; social: dispatch statuses"
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
echo SUCCESS - Cloudflare redeploys in about 2 minutes. Tell Claude "pushed".
pause
