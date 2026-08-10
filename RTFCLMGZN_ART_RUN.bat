@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  Issue 002 art run — generates every original image for the issue through the
REM  house pipeline (agents/social/gen_image.py -> Nano Banana / Gemini), then
REM  chops the two gatefolds into the -1/-2 halves the reader actually loads.
REM
REM  Uses the Gemini key already in agents\social\.secrets.json. Nothing is sent
REM  anywhere else and the key never leaves this machine.
REM
REM  SAFE TO RE-RUN. Images already on disk are skipped, so if this is interrupted
REM  (or a few calls fail) just double-click it again and it picks up where it left
REM  off instead of paying for the same image twice.
REM ============================================================================

echo.
echo   RTFCLMGZN - art run: Issue 002 + expanded Primer
echo   67 images: 55 for Issue 002 + 2 spare covers + 10 for the expanded Primer, then the gatefold chop.
echo   Roughly $2.30 at the house rate. Takes a while; leave this window open.
echo.

if not exist "agents\social\.secrets.json" (
  echo   ERROR: agents\social\.secrets.json not found.
  echo   Run this from the repo root - it must sit next to the agents\ folder.
  pause
  exit /b 1
)
if not exist "agents\magazine\art-prompts-all.json" (
  echo   ERROR: agents\magazine\art-prompts-all.json not found.
  pause
  exit /b 1
)

where uv >nul 2>nul
if errorlevel 1 (
  echo   ERROR: 'uv' is not on PATH. Install it, or run manually:
  echo     python agents\magazine\gen_issue_art.py agents\magazine\art-prompts-all.json
  pause
  exit /b 1
)

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\issue-002-art.log"
echo   Progress prints here and is copied to %LOGFILE%
echo.

REM Single invocation. PowerShell's Tee-Object mirrors the stream to the log so the
REM window shows live progress AND a full transcript survives for review afterwards.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "uv run --python 3.12 --with pillow python 'agents\magazine\gen_issue_art.py' 'agents\magazine\art-prompts-all.json' 2>&1 | Tee-Object -FilePath '%LOGFILE%' -Append; exit $LASTEXITCODE"
set "RC=%errorlevel%"

echo.
if "%RC%"=="0" (
  echo   DONE - every image generated and both gatefolds chopped.
) else (
  echo   FINISHED WITH FAILURES - see the log, then just run this file again
  echo   to retry only the ones that failed.
)
echo   Log:      %LOGFILE%
echo   Manifest: web\assets\img\_issue-art-manifest.json
echo.
pause
exit /b %RC%
