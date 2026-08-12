@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN - hide social drafts + prep social go-live
py -3 tools\social_polish.py 2>&1
if errorlevel 9009 python tools\social_polish.py 2>&1
echo.
echo  (full copy of everything above is in social_polish_log.txt)
pause
