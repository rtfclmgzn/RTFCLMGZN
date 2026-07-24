@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM Intentionally parallel to RTFCLMGZN_CLAUDE_CYCLE.bat (same exe-resolution,
REM token-check, catch-up-guard logic) but points at breaking-scan-runbook.md,
REM its own log file, and its own catch-up lock so this scan's cadence (every
REM 2h) never interferes with the 3 fixed daily cycles' own cooldown. Keep the
REM shared logic in sync if either file's env/token handling changes.

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\breaking-scan.log"
echo.>>"%LOGFILE%"
echo ==== Breaking scan %date% %time% ====>>"%LOGFILE%"

REM Kill switch: newsroom/runner/PAUSED existing skips the whole run, no auth
REM or process launch at all.
if exist "newsroom\runner\PAUSED" (
  echo PAUSED sentinel present - skipping run.>>"%LOGFILE%"
  exit /b 0
)

REM Same version-resolution and token-presence checks as the main cycle
REM launcher, run BEFORE the catch-up guard on purpose -- see that file's
REM comment for why (a transient failure here must not poison the lock and
REM cause a later on-time trigger to be silently skipped).
set "CLAUDE_ROOT=%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude-code"
set "CLAUDE_EXE="
for /f "delims=" %%D in ('dir /b /ad /o-n "%CLAUDE_ROOT%" 2^>nul') do (
  if not defined CLAUDE_EXE if exist "%CLAUDE_ROOT%\%%D\claude.exe" set "CLAUDE_EXE=%CLAUDE_ROOT%\%%D\claude.exe"
)
if not defined CLAUDE_EXE (
  echo claude.exe not found under: %CLAUDE_ROOT%>>"%LOGFILE%"
  exit /b 1
)
if "%CLAUDE_CODE_OAUTH_TOKEN%"=="" (
  echo CLAUDE_CODE_OAUTH_TOKEN is not set in this process's environment. Aborting.>>"%LOGFILE%"
  exit /b 1
)

REM Catch-up guard: if the PC was off through more than one 2-hour scan slot,
REM Windows fires their catch-ups back-to-back the moment it wakes -- this
REM lock ensures only the first one actually scans; the rest see a fresh
REM timestamp and skip. Own lock file, own cooldown -- unrelated to the main
REM cycles' last-run.marker.
for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0newsroom\runner\run-gate.ps1" -LockFile "%LOGROOT%\last-scan.marker" -CooldownMinutes 45') do set "GATE=%%G"
if /I "%GATE%"=="SKIP" (
  echo Skipped - a scan already ran within the last 45 minutes ^(catch-up guard^).>>"%LOGFILE%"
  exit /b 0
)

"%CLAUDE_EXE%" -p "Follow newsroom/runner/breaking-scan-runbook.md exactly, from the current repo root. Do not ask questions; make reasonable calls yourself and report them in your final summary." --model claude-sonnet-5 --allowedTools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch" >>"%LOGFILE%" 2>&1
set "RC=%errorlevel%"
echo Exit code: %RC%>>"%LOGFILE%"
exit /b %RC%
