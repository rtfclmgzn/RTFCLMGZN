@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM ============================================================================
REM  One-time: registers the 3-hourly Pulse Scan as a Windows Scheduled Task.
REM  Run this file once (right-click -> Run as administrator is safest; a
REM  non-admin register also works for the current user on most setups).
REM  The existing Cycle A/B/C and breaking-scan tasks are untouched.
REM  To remove later:  schtasks /delete /tn "RTFCLMGZN Pulse Scan" /f
REM ============================================================================

schtasks /query /tn "RTFCLMGZN Pulse Scan" >nul 2>nul
if not errorlevel 1 (
  echo "RTFCLMGZN Pulse Scan" already exists. Updating it in place...
  schtasks /delete /tn "RTFCLMGZN Pulse Scan" /f >nul
)

schtasks /create /tn "RTFCLMGZN Pulse Scan" ^
  /tr "\"%~dp0RTFCLMGZN_PULSE_SCAN.bat\"" ^
  /sc hourly /mo 3 /st 00:45 ^
  /f
if errorlevel 1 (
  echo.
  echo FAILED to register. Try re-running this file as administrator.
  pause
  exit /b 1
)

REM Fire missed runs as soon as possible after the PC was off — the bat's own
REM 100-minute gate stops catch-up stacking, same pattern as Cycle A/B/C.
schtasks /change /tn "RTFCLMGZN Pulse Scan" /ri 0 >nul 2>nul

echo.
echo Registered: "RTFCLMGZN Pulse Scan" — every 3 hours starting 00:45.
echo Offset from the top of the hour on purpose, so it never collides with
echo the Cycle A/B/C tasks or the breaking scan.
echo Log: %LOCALAPPDATA%\RTFCLMGZN\logs\pulse-scan.log
echo.
echo You can delete this setup file now.
pause
