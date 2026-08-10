@echo off
REM Runs SHIP_ALL.bat and keeps a full transcript in SHIP_LOG.txt, so a failure
REM is never just one red line on screen that scrolls away. Run THIS one.
cd /d "%~dp0"
call "%~dp0SHIP_ALL.bat" > "%~dp0SHIP_LOG.txt" 2>&1
set RC=%errorlevel%
type "%~dp0SHIP_LOG.txt"
echo.
echo ============================================================
if "%RC%"=="0" (echo  SHIP_ALL finished OK.) else (echo  SHIP_ALL FAILED with exit code %RC%.)
echo  Full transcript: SHIP_LOG.txt
echo ============================================================
exit /b %RC%
