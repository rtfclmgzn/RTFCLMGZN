@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  PULSE SCAN — every 3 hours, cheap model (haiku-class).
REM  Keeps Buzz, live-event statuses, and the Scoreboard freshness stamp
REM  current between full newsroom cycles. Runbook:
REM  newsroom/runner/pulse-scan-runbook.md
REM  Mirrors RTFCLMGZN_CLAUDE_CYCLE.bat's structure (kill switch, newest-version
REM  claude.exe resolution, token check, catch-up gate) with a shorter cooldown.
REM ============================================================================

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\pulse-scan.log"
echo.>>"%LOGFILE%"
echo ==== Pulse scan %date% %time% ====>>"%LOGFILE%"

if exist "newsroom\runner\PAUSED" (
  echo PAUSED sentinel present - skipping.>>"%LOGFILE%"
  exit /b 0
)

REM Claude Desktop rotates its claude-code\<version> folder on auto-update;
REM resolve the newest at run time (a hardcoded path breaks on the next update).
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
  echo CLAUDE_CODE_OAUTH_TOKEN not set. Aborting.>>"%LOGFILE%"
  exit /b 1
)

REM Catch-up guard: if the PC was off through several 3-hour marks, Windows
REM fires the missed runs back-to-back on wake — only the first should run.
for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0newsroom\runner\run-gate.ps1" -LockFile "%LOGROOT%\last-pulse.marker" -CooldownMinutes 100') do set "GATE=%%G"
if /I "%GATE%"=="SKIP" (
  echo Skipped - a pulse ran within the last 100 minutes.>>"%LOGFILE%"
  exit /b 0
)

"%CLAUDE_EXE%" -p "Follow newsroom/runner/pulse-scan-runbook.md exactly, from the current repo root. Do not ask questions; make the honest minimal call yourself and note it in your final report." --model claude-haiku-4-5 --allowedTools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch" >>"%LOGFILE%" 2>&1
set "RC=%errorlevel%"
echo Exit code: %RC%>>"%LOGFILE%"
exit /b %RC%
