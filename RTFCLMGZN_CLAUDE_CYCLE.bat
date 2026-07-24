@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

set "LOGROOT=%LOCALAPPDATA%\RTFCLMGZN\logs"
if not exist "%LOGROOT%" mkdir "%LOGROOT%" >nul 2>nul
set "LOGFILE=%LOGROOT%\claude-cycle.log"
echo.>>"%LOGFILE%"
echo ==== Claude cycle %date% %time% ====>>"%LOGFILE%"

REM Kill switch: newsroom/runner/PAUSED existing skips the whole run, no auth
REM or process launch at all.
if exist "newsroom\runner\PAUSED" (
  echo PAUSED sentinel present - skipping run.>>"%LOGFILE%"
  exit /b 0
)

REM The OAuth token is stored as a Machine-scope environment variable, which a
REM freshly-launched process tree (exactly what Task Scheduler creates) reads
REM correctly from the registry at process start -- no bridging needed here,
REM only needed manually in an already-running dev shell that predates the var.
REM
REM Claude Desktop auto-updates and rotates its claude-code\<version> folder
REM (e.g. 2.1.209 -> 2.1.217) without warning, so resolve the newest version
REM folder at run time instead of hardcoding one -- a hardcoded path silently
REM breaks the very next time Desktop updates itself.
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

"%CLAUDE_EXE%" -p "Follow newsroom/runner/cycle-runbook.md exactly, from the current repo root. Do not ask questions; make reasonable calls yourself and report them in your final summary." --model claude-sonnet-5 --allowedTools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch" >>"%LOGFILE%" 2>&1
set "RC=%errorlevel%"
echo Exit code: %RC%>>"%LOGFILE%"
exit /b %RC%
