@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
cd /d "%~dp0"
title RTFCLMGZN - link social accounts
py -3 tools\link_socials.py
if errorlevel 9009 python tools\link_socials.py
echo.
pause
