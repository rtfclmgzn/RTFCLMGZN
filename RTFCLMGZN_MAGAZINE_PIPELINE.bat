@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  MAGAZINE PIPELINE — one phase per invocation, six firings a month.
REM
REM    RTFCLMGZN_MAGAZINE_PIPELINE.bat gather    (25th, 26th, 27th)
REM    RTFCLMGZN_MAGAZINE_PIPELINE.bat curate    (28th)
REM    RTFCLMGZN_MAGAZINE_PIPELINE.bat build     (29th)
REM    RTFCLMGZN_MAGAZINE_PIPELINE.bat verify    (30th; February -> March 1)
REM
REM  This replaces the single-shot RTFCLMGZN_MAGAZINE_DRAFT.bat. Each firing is
REM  a SEPARATE headless Claude session with no memory of the last one, so all
REM  continuity lives in newsroom/runner/magazine-state/<YYYY-MM>.json, managed
REM  by newsroom/runner/pipeline_state.py. The runbook every phase reads is
REM  newsroom/runner/magazine-pipeline.md; the phase argument below tells it
REM  which section to execute.
REM
REM  Produces a DRAFT ONLY, on a local branch. Never publishes, never pushes to
REM  main. Structure mirrors RTFCLMGZN_CLAUDE_CYCLE.bat: kill switch, newest-
REM  version claude.exe resolution, token check, then a cooldown gate — here a
REM  PER-PHASE gate so a Windows catch-up trigger cannot fire the same phase
REM  twice in a day.
REM
REM  Register the schedule with SETUP_MAGAZINE_PIPELINE.bat.
REM ============================================================================

set "PHASE=%~1"
if "%PHASE%"=="" (
  echo Usage: %~nx0 ^<gather^|curate^|build^|verify^>
  exit /b 2
)
REM lowercase the argument so "Gather" from a hand-typed run still works
for %%P in (gather curate build verify) do (
  if /I "%PHASE%"=="%%P" set "PHASE=%%P"
)
if not "%PHASE%"=="gather" if not "%PHASE%"=="curate" if not "%PHASE%"=="build" if not "%PHASE%"=="verify" (
  echo Unknown phase "%~1" - expected gather, curate, build or verify.
  exit /b 2
)

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\magazine-%PHASE%.log"
echo.>>"%LOGFILE%"
echo ==== Magazine pipeline [%PHASE%] %date% %time% ====>>"%LOGFILE%"

REM Kill switch: the sentinel skips the whole run before any auth or process
REM launch. Same file the runbook re-checks in its own preamble.
if exist "newsroom\runner\PAUSED" (
  echo PAUSED sentinel present - skipping.>>"%LOGFILE%"
  exit /b 0
)

REM Claude Desktop rotates its claude-code\<version> folder on auto-update;
REM resolve the newest at run time (a hardcoded path breaks on the next update).
REM
REM These checks run BEFORE the cooldown gate on purpose: the gate writes its
REM lock the moment it grants GO, so a transient failure after the lock was
REM taken would silently suppress the next legitimate trigger too.
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

REM Catch-up guard, PER PHASE (each phase gets its own marker file). 20 hours:
REM long enough that a missed-then-caught-up trigger cannot re-fire the same
REM phase the same day, short enough that consecutive phases on consecutive
REM days are never blocked by each other. GATHER legitimately runs on three
REM different days and is unaffected — the marker is compared against the last
REM GATHER, ~24h earlier. Same run-gate.ps1 the Cycle and Pulse Scan tasks use.
for /f "delims=" %%G in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0newsroom\runner\run-gate.ps1" -LockFile "%LOGROOT%\last-magazine-%PHASE%.marker" -CooldownMinutes 1200') do set "GATE=%%G"
if /I "%GATE%"=="SKIP" (
  echo Skipped - the %PHASE% phase already ran within the last 20 hours ^(catch-up guard^).>>"%LOGFILE%"
  exit /b 0
)

REM Cheap pre-flight: refuse before spending a session if the phase's
REM prerequisite has not completed for this cycle month. pipeline_state.py
REM exits 3 for "declined on purpose" and writes the reason into the state log
REM as well as stdout. The runbook re-checks this itself — this is only here so
REM a blocked phase costs nothing.
REM
REM uv is how every other runner here invokes Python, but a Scheduled Task's
REM PATH is not a dev shell's — fall back to plain python rather than skipping
REM the check silently.
set "PSTATE=newsroom\runner\pipeline_state.py"
set "PYRUN="
where uv >nul 2>nul
if not errorlevel 1 set "PYRUN=uv run --python 3.12 python"
if not defined PYRUN (
  where python >nul 2>nul
  if not errorlevel 1 set "PYRUN=python"
)

if not exist "%PSTATE%" (
  echo WARNING: %PSTATE% missing - running without the pre-flight prerequisite check.>>"%LOGFILE%"
) else if not defined PYRUN (
  echo WARNING: neither uv nor python is on PATH - skipping the pre-flight check.>>"%LOGFILE%"
) else (
  %PYRUN% "%PSTATE%" require --phase %PHASE% >>"%LOGFILE%" 2>&1
  if errorlevel 3 (
    echo Pre-flight declined the %PHASE% phase - reason logged above and in the state file.>>"%LOGFILE%"
    exit /b 0
  )
)

"%CLAUDE_EXE%" -p "Follow newsroom/runner/magazine-pipeline.md exactly, from the current repo root. The phase you are running is: %PHASE%. Do the common preamble (section 0), then ONLY the section for that phase, then the common close (section Z). Do not run the other phases. Do not ask questions; make reasonable calls yourself and record them in the pipeline state file. Never publish and never push to main." --model claude-opus-4-8 --allowedTools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch" >>"%LOGFILE%" 2>&1
set "RC=%errorlevel%"
echo Exit code: %RC%>>"%LOGFILE%"
exit /b %RC%
