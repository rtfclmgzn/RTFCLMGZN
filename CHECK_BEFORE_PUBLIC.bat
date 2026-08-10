@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  RUN THIS BEFORE MAKING THE REPO PUBLIC.
REM
REM  .gitignore only stops NEW commits. If a secret was ever committed — even once,
REM  even years ago, even if you deleted it the next commit — it is still sitting in
REM  the history, and making the repo public publishes the history too.
REM
REM  This is read-only. It changes nothing.
REM ============================================================================

echo.
echo   Pre-public secret sweep
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 ( echo   ERROR: not a git repository. & pause & exit /b 1 )

set "FOUND=0"

echo   [1/3] Was .secrets.json ever committed?
for /f "delims=" %%H in ('git log --all --full-history --oneline -- "agents/social/.secrets.json" "**/.secrets.json" 2^>nul') do (
  echo         HIT: %%H
  set "FOUND=1"
)
if "!FOUND!"=="0" (echo         clean.) else (echo         ^>^> your Gemini key is in the history.)

echo.
echo   [2/3] Any key-shaped strings anywhere in history?
set "KEYHIT=0"
for %%P in ("AIza" "sk-ant-" "sk-live-" "sk_live_" "whsec_" "-----BEGIN") do (
  for /f "delims=" %%H in ('git log --all --oneline -S %%~P 2^>nul') do (
    echo         %%~P in commit %%H
    set "KEYHIT=1"
    set "FOUND=1"
  )
)
if "!KEYHIT!"=="0" echo         clean.

echo.
echo   [3/3] Is .secrets.json tracked right now?
git ls-files --error-unmatch "agents/social/.secrets.json" >nul 2>nul
if errorlevel 1 (echo         not tracked. good.) else (
  echo         ^>^> IT IS TRACKED. Run:  git rm --cached agents/social/.secrets.json
  set "FOUND=1"
)

echo.
echo   ============================================================
if "!FOUND!"=="0" (
  echo     CLEAN. Nothing key-shaped in the history.
  echo     Safe to make the repo public.
) else (
  echo     STOP. Something above needs dealing with first.
  echo.
  echo     If a key is in the history, the fastest safe fix is to
  echo     ROTATE THE KEY, not to rewrite history:
  echo       - Gemini:  aistudio.google.com  -^> delete the key, make a new one
  echo       - Update agents\social\.secrets.json and the GEMINI_API_KEY
  echo         secret in GitHub and Cloudflare.
  echo.
  echo     A rotated key in an old commit is a dead string. Rewriting
  echo     history is slower, riskier, and does not help if the repo
  echo     was ever pushed anywhere.
)
echo   ============================================================
echo.
pause
