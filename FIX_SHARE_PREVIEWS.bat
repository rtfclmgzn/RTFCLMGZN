@echo off
setlocal
title RTFCLMGZN - fix Facebook link previews
cd /d "%~dp0"
echo Shipping the share-page fix: Facebook's crawler was following a
echo hidden redirect to the homepage and grabbing the generic purple
echo tree instead of the article cover. Also ships the new narrated
echo dispatcher + hashtag engine.
echo.
git add "functions/share/[slug].js" agents\social\post_social.py agents\social\social-posting.agent.md RTFCLMGZN_SOCIAL_DISPATCH.bat FIX_SHARE_PREVIEWS.bat
git commit -m "share pages: JS-only redirect (FB was unfurling the homepage card); dispatcher: narrated output, log file, per-platform hashtag engine"
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo A cycle pushed at the same moment - run this .bat once more.
  pause
  exit /b 1
)
git push origin main
echo.
echo If a sign-in window appeared: pick rtfclmgzn, NOT cognivorlabs.
echo Cloudflare redeploys in about 2 minutes - Claude takes it from there.
pause
