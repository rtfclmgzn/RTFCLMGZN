@echo off
setlocal
title RTFCLMGZN - ship tonight's social system (one push)
cd /d "%~dp0"
echo [1/6] Installing the social-dispatch workflow (every 3 hours)...
if not exist _workflow_updates\social-dispatch.yml (
  echo MISSING _workflow_updates\social-dispatch.yml - tell Claude.
  pause
  exit /b 1
)
copy /y _workflow_updates\social-dispatch.yml .github\workflows\social-dispatch.yml >nul
echo [2/6] Committing tonight's full social polish...
git add -A ".github/workflows/social-dispatch.yml" "functions/share/[slug].js" web\data\social-posts.js agents\social\post_social.py agents\social\social-posting.agent.md newsroom\runner\cycle-runbook.md RTFCLMGZN_SOCIAL_DISPATCH.bat FIX_SHARE_PREVIEWS.bat SHIP_TONIGHT.bat _workflow_updates\social-dispatch.yml
git commit -m "social system: around-the-clock dispatch workflow (3h), CI-safe dedupe history, portrait previews for FB/IG/Threads, IG portrait-first, hashtag engine, narrated dispatcher, runbook 4c portrait staging"
echo [3/6] Stashing leftovers so the pull can never refuse...
git stash push -u -m ship-tonight-leftovers
echo [4/6] Pulling latest...
git pull --rebase origin main
if errorlevel 1 (
  echo PULL FAILED - tell Claude, nothing was lost. Stash: ship-tonight-leftovers
  git rebase --abort >nul 2>nul
  pause
  exit /b 1
)
echo [5/6] Pushing (sign in as rtfclmgzn if a window appears)...
git push origin main
if errorlevel 1 (
  echo PUSH FAILED - read the lines above and tell Claude what they say.
  pause
  exit /b 1
)
echo [6/6] Restoring stashed leftovers...
git stash pop
echo.
echo SUCCESS. Cloudflare redeploys in ~2 min; the every-3-hours poster is
echo installed and will SKIP CLEANLY until you add the GitHub secret:
echo   repo Settings ^> Secrets and variables ^> Actions ^> New repository secret
echo   Name:  RTFC_SOCIAL_SECRETS
echo   Value: the ENTIRE contents of agents\social\.secrets.json (open in Notepad)
pause
