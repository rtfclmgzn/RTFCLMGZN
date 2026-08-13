@echo off
setlocal
title RTFCLMGZN social dispatch
cd /d "%~dp0"
echo ============================================================
echo  RTFCLMGZN SOCIAL DISPATCH
echo  Live play-by-play below. Cooldown waits print a countdown,
echo  so a quiet moment is NEVER a hang. The last line tells you
echo  when it is safe to close this window.
echo ============================================================
echo.
where py >nul 2>nul
if %errorlevel%==0 (set "PYCMD=py -3") else (set "PYCMD=python")
%PYCMD% -u agents\social\post_social.py --live --verbose
echo.
echo ============================================================
echo  Run finished. Full log: social_dispatch_log.txt
echo ============================================================
pause
