@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  SHIP_ALL.bat -- run SHIP.bat instead, which keeps a transcript.
REM
REM  There is deliberately NO inline python in this file any more. Every check and
REM  the cache-buster bump live in ship_preflight.py. Three shipping attempts died
REM  because cmd.exe rewrites the command line before python ever sees it: it
REM  strips an unpaired %, and with EnableDelayedExpansion (which the deploy poll
REM  below needs) it treats ! as an expansion sigil and ate the middle of the
REM  cache-buster command. None of that is visible in the source. It cannot happen
REM  to code in a .py file.
REM
REM  This does NOT run newsroom.runner.verify_publish_surface: that guard stops an
REM  UNATTENDED CYCLE from touching anything outside web/, and this commit changes
REM  specs, schemas and a Pages Function on purpose. Per the guard's own error
REM  text, that work belongs in a human-reviewed commit. Every scheduled cycle
REM  after this stays bound by it.
REM ============================================================================

echo.
echo === Where we are ===
git rev-parse --abbrev-ref HEAD
git log -1 --pretty=format:"  HEAD: %%h %%s"
echo.
echo.

python ship_preflight.py
if errorlevel 1 goto :fail

set NEWB=
set /p NEWB=<.newb
del .newb >nul 2>nul
if "%NEWB%"=="" (
  echo.
  echo   ship_preflight.py did not report a new cache-buster number.
  goto :fail
)

echo.
echo === Staging ===
REM issue-001.js is deleted on purpose: while it sat in web/data any visitor
REM could curl the entire paid issue. `git add -A` on that one path records the
REM deletion; the payload now lives behind functions/api/issue/[id].js.
git add -A web/data/issue-001.js
git add web/assets/app.js web/assets/styles.css web/index.html web/_headers web/data/worldmap.js web/data/guides.js web/data/figures.js web/data/resolutions.js web/data/entities.js web/data/resources.js web/data/newsroom-articles.js web/data/magazine-issues.js web/data/issue-001-meta.js functions/api/geo.js "functions/api/issue/[id].js" functions/api/issue/_data/issue-001.json functions/api/issue/_data/primer.json ship_preflight.py README.md agents/_shared/visual-components.md agents/_shared/loop-doctrine.md agents/_shared/house-style-guide.md agents/_shared/format-routing.md agents/_shared/format-and-image-policy.md agents/retired newsroom/runner/cycle-runbook.md newsroom/runner/breaking-scan-runbook.md newsroom/runner/pulse-scan-runbook.md newsroom/schemas/article-draft.json newsroom/autonomy/schema.py newsroom/quality/article_score.py newsroom/quality/component_audit.py RTFCLMGZN_PULSE_SCAN.bat SETUP_PULSE_SCHEDULE.bat
if errorlevel 1 goto :fail

git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo   Nothing staged -- everything already matches HEAD.
  echo   Check: git log --oneline -5
  goto :done
)
git diff --cached --stat
echo.

echo === Committing ===
git commit -F SHIP_ALL_MSG.txt
if errorlevel 1 goto :fail

echo.
echo === Pushing to origin/main ===
git push origin main
if errorlevel 1 goto :pushfail

echo.
echo === Waiting for the Cloudflare deploy (looking for b=%NEWB%) ===
for /l %%i in (1,1,25) do (
  curl -s -H "Cache-Control: no-cache" https://rtfclmgzn.com/ | findstr /c:"?b=%NEWB%" >nul 2>nul
  if not errorlevel 1 (
    echo   Deploy landed: b=%NEWB% is live.
    goto :verify
  )
  echo   ...not yet ^(check %%i of 25^)
  timeout /t 8 /nobreak >nul
)
echo   WARNING: b=%NEWB% not seen after ~200s. The push succeeded; Cloudflare may
echo            still be building. Re-check in a minute.
goto :done

:verify
echo.
echo === Post-deploy checks ===
curl -s -o nul -w "  data/worldmap.js    http %%{http_code}\n" https://rtfclmgzn.com/data/worldmap.js
curl -s -o nul -w "  data/guides.js      http %%{http_code}\n" https://rtfclmgzn.com/data/guides.js
curl -s -o nul -w "  data/figures.js     http %%{http_code}\n" https://rtfclmgzn.com/data/figures.js
curl -s -o nul -w "  data/resolutions.js http %%{http_code}\n" https://rtfclmgzn.com/data/resolutions.js
curl -s -o nul -w "  api/geo             http %%{http_code}\n" https://rtfclmgzn.com/api/geo
echo.
echo   200 on the four data files means the build shipped.
echo   /api/geo returning 503 not-configured just means D1 is not bound to this
echo   Pages project yet -- the reader map falls back to its honest local state.
goto :done

:pushfail
echo.
echo PUSH REJECTED -- a scheduled cycle almost certainly pushed while this ran.
echo The commit is safe locally. Run these two lines and you are done:
echo     git pull --rebase origin main
echo     git push origin main
exit /b 1

:fail
echo.
echo FAILED -- nothing was committed or pushed. The error is above.
exit /b 1

:done
echo.
echo Done.
exit /b 0
