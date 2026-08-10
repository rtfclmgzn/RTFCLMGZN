@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul

REM ============================================================================
REM  Turns OFF the Windows Scheduled Tasks now that GitHub Actions runs everything.
REM
REM  RUN THIS ONLY AFTER you have confirmed the GitHub workflows are firing —
REM  check the repo's Actions tab and see at least one green run. Until then you
REM  want the PC tasks as a fallback.
REM
REM  It DISABLES rather than deletes, so you can turn them back on with /change /enable
REM  if something goes wrong. Nothing is lost.
REM ============================================================================

echo.
echo   Disabling the RTFCLMGZN scheduled tasks on this PC...
echo.

for %%T in (
  "RTFCLMGZN Cycle"
  "RTFCLMGZN Claude Cycle"
  "RTFCLMGZN Pulse Scan"
  "RTFCLMGZN Claude Breaking Scan"
  "RTFCLMGZN Breaking Scan"
  "RTFCLMGZN Magazine Draft"
  "RTFCLMGZN Magazine Gather"
  "RTFCLMGZN Magazine Gather 1"
  "RTFCLMGZN Magazine Gather 2"
  "RTFCLMGZN Magazine Gather 3"
  "RTFCLMGZN Magazine Curate"
  "RTFCLMGZN Magazine Build"
  "RTFCLMGZN Magazine Build (Feb)"
  "RTFCLMGZN Magazine Verify"
  "RTFCLMGZN Magazine Verify (Feb)"
  "RTFCLMGZN Autopilot"
  "RTFCLMGZN Newsroom"
  "RTFCLMGZN Buzz"
) do (
  schtasks /query /tn %%T >nul 2>nul
  if not errorlevel 1 (
    schtasks /change /tn %%T /disable >nul 2>nul
    if errorlevel 1 (echo   could not disable: %%T) else (echo   disabled: %%T)
  )
)

echo.
echo   Done. Your PC no longer runs the newsroom.
echo.
echo   Everything now runs on GitHub Actions. To watch it:
echo     your repo  ^>  Actions tab
echo.
echo   To turn a task back on:
echo     schtasks /change /tn "RTFCLMGZN Pulse Scan" /enable
echo.
echo   Still on this PC, and still needing it:  nothing.
echo.
pause
