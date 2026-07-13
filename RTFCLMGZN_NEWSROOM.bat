@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN Newsroom Studio v0.3

if not exist "%~dp0newsroom\app.py" (
  echo.
  echo ERROR: Newsroom Core files are missing.
  echo Re-run the consolidated RTFCLMGZN Platform installer.
  echo.
  pause
  exit /b 1
)

py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if not errorlevel 1 (
  py -3 -m newsroom.app --project "%CD%"
  set "RC=!ERRORLEVEL!"
  if not "!RC!"=="0" pause
  exit /b !RC!
)

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if not errorlevel 1 (
  python -m newsroom.app --project "%CD%"
  set "RC=!ERRORLEVEL!"
  if not "!RC!"=="0" pause
  exit /b !RC!
)

echo.
echo ERROR: Python 3.10 or newer was not found.
echo Re-run INSTALL_RTFCLMGZN_PLATFORM.bat from the downloaded package.
echo.
pause
exit /b 1
