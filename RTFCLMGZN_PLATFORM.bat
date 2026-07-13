@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"
title RTFCLMGZN Platform v0.3

:menu
cls
echo.
echo =============================================================
echo   RTFCLMGZN PLATFORM v0.3
 echo =============================================================
echo.
echo   1. Open Newsroom Studio
echo   2. Run Autopilot now
echo   3. Configure providers, budgets, and operating mode
echo   4. Enable scheduled Autopilot
echo   5. Disable scheduled Autopilot
echo   6. Open Editorial Release Manager
echo   7. Run platform diagnostics
echo   8. Open project folder
echo   9. Exit
echo.
choice /C 123456789 /N /M "Choose an option [1-9]: "
if errorlevel 9 exit /b 0
if errorlevel 8 start "" "%CD%" & goto menu
if errorlevel 7 call "%~dp0RTFCLMGZN_PLATFORM_DIAGNOSTICS.bat" & goto menu
if errorlevel 6 start "" "%~dp0RTFCLMGZN_RELEASE_MANAGER.bat" & goto menu
if errorlevel 5 call "%~dp0DISABLE_RTFCLMGZN_AUTOPILOT.bat" & goto menu
if errorlevel 4 call "%~dp0ENABLE_RTFCLMGZN_AUTOPILOT.bat" & goto menu
if errorlevel 3 call "%~dp0CONFIGURE_RTFCLMGZN_AUTOPILOT.bat" & goto menu
if errorlevel 2 call "%~dp0RUN_RTFCLMGZN_AUTOPILOT.bat" & goto menu
if errorlevel 1 start "" "%~dp0RTFCLMGZN_NEWSROOM.bat" & goto menu
