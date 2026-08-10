@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN - ship cover fix + social pipeline
py -3 tools\ship_fix.py 2>&1
if errorlevel 9009 python tools\ship_fix.py 2>&1
echo.
echo  (full copy of everything above is in ship_fix_log.txt)
pause
