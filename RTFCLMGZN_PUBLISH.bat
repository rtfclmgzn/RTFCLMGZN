@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  PUBLISH - commits and pushes the August 2026 magazine release.
REM
REM  Fixes over the first version, which failed:
REM    * "git rm" refused on files with local modifications -> now uses -f
REM    * the scoped "git add" left other files unstaged, and git refuses to
REM      rebase with unstaged changes -> now pulls with --autostash
REM    * issue-003.* leftovers from an abandoned renumber were being staged
REM      -> now deleted from disk and from the index before anything is staged
REM
REM  Safe to re-run. If there is nothing new it says so and exits without pushing.
REM ============================================================================

echo.
echo   RTFCLMGZN - publish the August release
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo   ERROR: not a git repository.
  pause
  exit /b 1
)

set "MSG=agents\magazine\COMMIT_MSG.txt"
if not exist "%MSG%" (
  echo   ERROR: %MSG% not found.
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
echo   branch: %BRANCH%
echo.

REM --- 1. remove the leaking paid-issue file -----------------------------------
REM  web/data/issue-001.js held all 59 spreads of the paid issue, and web/ is
REM  served as static assets, so it was fetchable directly by anyone. -f because
REM  it has local modifications (it was emptied in place first).
if exist "web\data\issue-001.js" (
  echo   removing web/data/issue-001.js  ^(paid issue was publicly fetchable^)
  git rm -q -f --ignore-unmatch "web/data/issue-001.js"
)

REM  models-issue.js is superseded: its content is now inside the expanded Primer.
if exist "web\data\models-issue.js" (
  echo   removing web/data/models-issue.js  ^(merged into the Primer^)
  git rm -q -f --ignore-unmatch "web/data/models-issue.js"
)

REM  NOTE: web/data/issue-001-meta.js is KEPT. It is the live stub for "The First
REM  Half". An earlier draft of this script tried to delete it, which was wrong.

REM --- 2. drop the abandoned-renumber leftovers ---------------------------------
REM  A renumber to 002/003 was tried and reverted. These files are inert - nothing
REM  imports them - but they must not ship or the shelf reads as four issues.
for %%F in ("functions\api\issue\_data\issue-003.json" "web\data\issue-003-meta.js") do (
  if exist %%F (
    echo   removing %%F  ^(leftover from the reverted renumber^)
    git rm -q -f --ignore-unmatch %%F >nul 2>nul
    if exist %%F del /q %%F
  )
)

REM --- 3. stage everything ------------------------------------------------------
REM  Whole-tree add on purpose. A scoped add leaves other working-tree edits
REM  unstaged, and "git pull --rebase" refuses to run with unstaged changes -
REM  which is exactly how the first attempt died after committing.
git add -A
if errorlevel 1 (
  echo   ERROR: git add failed.
  pause
  exit /b 1
)

echo.
echo   staged:
git --no-pager diff --cached --stat
echo.

git diff --cached --quiet
if not errorlevel 1 (
  echo   Nothing to commit - already up to date.
  pause
  exit /b 0
)

REM  The first attempt DID commit before it died on the pull, so a local commit
REM  with this same subject may already exist - carrying the issue-003 leftovers
REM  this run just removed. If that commit is still unpushed, amend it rather than
REM  stacking a near-duplicate on top. Amending an unpushed commit is safe; this
REM  never touches anything that has already left the machine.
set "AMEND="
set "AHEAD=0"
set "SUBJ="
git rev-parse --verify --quiet "origin/%BRANCH%" >nul 2>nul
if not errorlevel 1 for /f %%N in ('git rev-list --count origin/%BRANCH%..HEAD') do set "AHEAD=%%N"
for /f "delims=" %%S in ('git log -1 --pretty^=%%s 2^>nul') do set "SUBJ=%%S"
if "%AHEAD%"=="1" if "%SUBJ:~0,24%"=="Magazine: August release" set "AMEND=--amend"
if defined AMEND echo   amending the unpushed commit from the previous attempt

git commit -q %AMEND% -F "%MSG%"
if errorlevel 1 (
  echo   ERROR: commit failed.
  pause
  exit /b 1
)
echo   committed.
echo.

REM --- 4. rebase onto the remote ------------------------------------------------
REM  --autostash so any straggler edit made while this ran cannot block the rebase.
echo   pulling with rebase ^(other scheduled tasks push to this branch too^)...
git pull --rebase --autostash origin %BRANCH%
if errorlevel 1 (
  echo.
  echo   REBASE STOPPED - nothing was pushed. Your commit is safe and local.
  echo   Resolve the conflict, run: git rebase --continue
  echo   then re-run this file. Do NOT force-push: other cycles share this branch.
  pause
  exit /b 1
)

git push origin %BRANCH%
if errorlevel 1 (
  echo   ERROR: push failed. The commit is still local; nothing was lost.
  pause
  exit /b 1
)

echo.
echo   PUSHED. Cloudflare Pages will build from %BRANCH%.
echo   Once the deploy finishes, https://rtfclmgzn.com/#/magazine should show three
echo   issues: the expanded Primer, 001 The First Half, and 002 The Reckoning.
echo.
pause
