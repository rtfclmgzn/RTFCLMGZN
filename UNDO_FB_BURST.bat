@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN - clean up the Facebook burst
py -3 tools\undo_fb_burst.py
if errorlevel 9009 python tools\undo_fb_burst.py
echo.
pause
