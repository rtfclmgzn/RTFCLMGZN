@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\social.log"
echo.>>"%LOGFILE%"
echo ==== Social dispatch %date% %time% ====>>"%LOGFILE%"
py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 (
  py -3 agents\social\post_social.py --live %* >>"%LOGFILE%" 2>&1
  exit /b %errorlevel%
)
python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if not errorlevel 1 (
  python agents\social\post_social.py --live %* >>"%LOGFILE%" 2>&1
  exit /b %errorlevel%
)
echo Python 3.10+ unavailable.>>"%LOGFILE%"
exit /b 1
