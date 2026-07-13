@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN Autopilot
call :find_python
if errorlevel 1 goto no_python
:menu
cls
echo.
echo =============================================================
echo   RTFCLMGZN AUTOPILOT v0.3
echo =============================================================
echo.
echo   1. Run research + draft/review cycle (cannot publish)
echo   2. Run configured bounded cycle (may publish only if preauthorized)
echo   3. Run discovery dry-run
echo   4. Show autonomy status
echo   5. Exit
echo.
choice /C 12345 /N /M "Choose an option [1-5]: "
if errorlevel 5 exit /b 0
if errorlevel 4 %PYTHON_CMD% -m newsroom.cli --project "%CD%" autonomy-status & pause & goto menu
if errorlevel 3 %PYTHON_CMD% -m newsroom.cli --project "%CD%" run-cycle --dry-run --force & pause & goto menu
if errorlevel 2 goto bounded
if errorlevel 1 %PYTHON_CMD% -m newsroom.cli --project "%CD%" run-cycle --force & pause & goto menu
:bounded
echo.
echo This does not create authorization. It only executes authorization already
 echo saved by the configuration wizard and only after every deterministic gate.
set /p "CONFIRM=Type RUN BOUNDED AUTOPILOT to continue: "
if not "!CONFIRM!"=="RUN BOUNDED AUTOPILOT" (
  echo Confirmation did not match. Nothing ran.
  pause
  goto menu
)
%PYTHON_CMD% -m newsroom.cli --project "%CD%" run-cycle --force --allow-publish-if-authorized
pause
goto menu
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
