@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN Platform Diagnostics

call :find_python
if errorlevel 1 goto no_python

echo.
echo =============================================================
echo   RTFCLMGZN PLATFORM DIAGNOSTICS
echo =============================================================
echo.
%PYTHON_CMD% -m compileall -q newsroom tools\release_manager
if errorlevel 1 goto failed
%PYTHON_CMD% -m unittest discover -s newsroom\tests -v
if errorlevel 1 goto failed
%PYTHON_CMD% -m newsroom.cli --project "%CD%" doctor
if errorlevel 1 goto failed

echo.
echo All platform diagnostics passed. Nothing was published.
echo.
pause
exit /b 0

:find_python
py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  exit /b 0
)
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  exit /b 0
)
exit /b 1

:no_python
echo.
echo ERROR: Python 3.10 or newer was not found.
echo Re-run the consolidated Platform installer.
echo.
pause
exit /b 1

:failed
echo.
echo One or more diagnostics failed. Nothing was published.
echo.
pause
exit /b 1
