@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "SCRIPT=%~dp0tools\release_manager\release_manager.py"

if not exist "%SCRIPT%" (
  echo.
  echo ERROR: Release Manager files are missing.
  echo Expected: %SCRIPT%
  echo Re-run the consolidated RTFCLMGZN Platform installer.
  echo.
  pause
  exit /b 1
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%SCRIPT%"
  set "RC=!errorlevel!"
  if not "!RC!"=="0" pause
  exit /b !RC!
)

where python >nul 2>nul
if %errorlevel%==0 (
  python "%SCRIPT%"
  set "RC=!errorlevel!"
  if not "!RC!"=="0" pause
  exit /b !RC!
)

echo.
echo Python 3 was not found on this computer.
echo The Release Manager uses Python's built-in local web server and needs no extra packages.
echo.
choice /C YN /N /M "Open the official Python for Windows download page now? [Y/N] "
if errorlevel 2 exit /b 1
start "" "https://www.python.org/downloads/windows/"
echo.
echo Install Python with "Add python.exe to PATH" enabled, then run this file again.
echo.
pause
exit /b 1
