@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  MAGAZINE DRAFT — once a month, judgment-tier model (opus-class).
REM  Curates the month just finished into a full issue draft (30-40pp, art,
REM  predictions graded) and stops on a local branch for founder review. Never
REM  publishes and never pushes to main — see newsroom/runner/magazine-runbook.md
REM  Part 4 for why. Mirrors RTFCLMGZN_CLAUDE_CYCLE.bat's structure (kill switch,
REM  newest-version claude.exe resolution, token check, catch-up gate) with a
REM  once-a-month cooldown instead of an hourly one.
REM ============================================================================

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\magazine-draft.log"
echo.>>"%LOGFILE%"
echo ==== Magazine draft %date% %time% ====>>"%LOGFILE%"

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

REM Catch-up guard: a long cooldown (20 days) against a monthly marker, so a
REM missed-then-caught-up Scheduled Task trigger can't fire this twice in the
REM same month. Same pattern as the daily Cycle / 3-hourly Pulse Scan, scaled
REM to a monthly cadence.
for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0newsroom\runner\run-gate.ps1" -LockFile "%LOGROOT%\last-magazine.marker" -CooldownMinutes 28800') do set "GATE=%%G"
if /I "%GATE%"=="SKIP" (
  echo Skipped - a magazine draft already ran within the last 20 days.>>"%LOGFILE%"
  exit /b 0
)

"%CLAUDE_EXE%" -p "Follow newsroom/runner/magazine-runbook.md exactly, from the current repo root. Do not ask questions; make reasonable calls yourself and report them in the draft-ready note the runbook tells you to write. Never push to main." --model claude-opus-4-8 --allowedTools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch" >>"%LOGFILE%" 2>&1
set "RC=%errorlevel%"
echo Exit code: %RC%>>"%LOGFILE%"
exit /b %RC%
