@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN Autopilot Configuration
call :find_python
if errorlevel 1 goto no_python
%PYTHON_CMD% -m newsroom.cli --project "%CD%" configure
set "RC=!ERRORLEVEL!"
echo.
if "!RC!"=="0" (echo Configuration finished.) else (echo Configuration stopped safely. No article was published.)
echo.
pause
exit /b !RC!
:find_python
py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 (set "PYTHON_CMD=py -3" & exit /b 0)
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 (set "PYTHON_CMD=python" & exit /b 0)
exit /b 1
:no_python
echo ERROR: Python 3.10 or newer was not found.
pause
exit /b 1
