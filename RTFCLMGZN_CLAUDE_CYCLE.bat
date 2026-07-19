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
set "CLAUDE_EXE=%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude-code\2.1.209\claude.exe"
if not exist "%CLAUDE_EXE%" (
  echo claude.exe not found at expected path: %CLAUDE_EXE%>>"%LOGFILE%"
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
