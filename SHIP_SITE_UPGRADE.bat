@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN - site upgrade (splash, language, scroll, Cognivor Labs)
py -3 tools\site_upgrade.py 2>&1
if errorlevel 9009 python tools\site_upgrade.py 2>&1
if errorlevel 1 (
  echo.
  echo  Prep failed - tell Claude. Nothing was pushed.
  pause
  exit /b 1
)
echo.
echo  Pushing (sign in as rtfclmgzn if GitHub asks) ...
git push origin main
if errorlevel 1 (
  echo  Push failed - tell Claude.
  pause
  exit /b 1
)
echo.
echo  LIVE after the ~1 minute deploy. Hard-refresh (Ctrl+F5) to see the splash.
pause
