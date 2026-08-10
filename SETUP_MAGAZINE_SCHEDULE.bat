@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM ============================================================================
REM  One-time: registers the monthly Magazine Draft as a Windows Scheduled Task.
REM  Run this file once (right-click -> Run as administrator is safest; a
REM  non-admin register also works for the current user on most setups).
REM  The existing Cycle A/B/C, Pulse Scan, and breaking-scan tasks are untouched.
REM  To remove later:  schtasks /delete /tn "RTFCLMGZN Magazine Draft" /f
REM ============================================================================

schtasks /query /tn "RTFCLMGZN Magazine Draft" >nul 2>nul
if not errorlevel 1 (
  echo "RTFCLMGZN Magazine Draft" already exists. Updating it in place...
  schtasks /delete /tn "RTFCLMGZN Magazine Draft" /f >nul
)

REM Day 1 of every month, 06:00 local — after the last of the prior month's
REM 17:00-Central regular cycle and overnight breaking-scans have landed, so
REM the curation step sees the complete month when it reads newsroom-articles.js.
schtasks /create /tn "RTFCLMGZN Magazine Draft" ^
  /tr "\"%~dp0RTFCLMGZN_MAGAZINE_DRAFT.bat\"" ^
  /sc monthly /d 1 /st 06:00 ^
  /f
if errorlevel 1 (
  echo.
  echo FAILED to register. Try re-running this file as administrator.
  pause
  exit /b 1
)

REM Fire missed runs as soon as possible after the PC was off — the bat's own
REM 20-day gate stops it from ever double-firing in the same month.
schtasks /change /tn "RTFCLMGZN Magazine Draft" /ri 0 >nul 2>nul

echo.
echo Registered: "RTFCLMGZN Magazine Draft" — day 1 of every month at 06:00.
echo This produces a DRAFT ONLY on a local git branch (magazine-draft-issue-NNN)
echo and never publishes on its own — see newsroom/releases/DRAFT-READY-issue-*.md
echo after it runs, then review in a real browser before asking Claude to ship it.
echo Log: %LOCALAPPDATA%\RTFCLMGZN\logs\magazine-draft.log
echo.
echo You can delete this setup file now.
pause
