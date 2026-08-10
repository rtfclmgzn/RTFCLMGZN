@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  Ships the visual component system. One-off -- delete this file and
REM  SHIP_VISUAL_SYSTEM_MSG.txt once it has run.
REM
REM  Deliberately does NOT run newsroom.runner.verify_publish_surface. That guard
REM  exists to stop an UNATTENDED CYCLE from touching anything outside web/, and
REM  this commit intentionally changes pipeline specs and schemas (agents/,
REM  newsroom/). Per the guard's own error text, spec work "belongs in a
REM  human-reviewed commit, not an unattended cycle" -- which is what this is.
REM  Every scheduled cycle after this remains bound by the guard.
REM ============================================================================

echo.
echo === Pre-flight checks ===

python -c "import json;json.load(open('newsroom/schemas/article-draft.json',encoding='utf-8'));print('  article-draft.json : valid JSON')"
if errorlevel 1 goto :fail

python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ('newsroom/autonomy/schema.py','newsroom/quality/article_score.py')];print('  python files       : parse clean')"
if errorlevel 1 goto :fail

REM Mojibake guard from the cycle runbook. index.html is full of em dashes and
REM curly quotes; a non-UTF-8-safe edit silently corrupts the entire file.
python -c "import sys;s=open('web/index.html',encoding='utf-8',errors='replace').read();n=s.count(chr(226)+chr(8364));print('  index.html UTF-8   : clean' if n==0 else 'MOJIBAKE: %d'%n);sys.exit(1 if n else 0)"
if errorlevel 1 goto :fail

python -c "import json,re;s=open('web/data/newsroom-articles.js',encoding='utf-8').read();a=json.loads(s[s.index('['):].rstrip().rstrip(';'));C={'chart','compare','timeline','entity','scorecard','ledger','beforeafter','spectrum','flow','keyfacts','stakes','sourcecheck','stat'};bad=[(x['slug'],b['type']) for x in a for b in x['body'] if b['type'] in C and 'text' in b];print('  component blocks   : none carry top-level text' if not bad else 'BAD: %s'%bad);raise SystemExit(1 if bad else 0)"
if errorlevel 1 goto :fail

python -m newsroom.quality.component_audit
if errorlevel 1 goto :fail

echo.
echo === Staging ===
git add web/assets/app.js web/assets/styles.css web/index.html web/data/entities.js web/data/newsroom-articles.js web/data/resources.js web/data/figures.js web/data/resolutions.js agents/_shared/visual-components.md agents/_shared/loop-doctrine.md newsroom/runner/cycle-runbook.md newsroom/runner/breaking-scan-runbook.md newsroom/runner/pulse-scan-runbook.md newsroom/schemas/article-draft.json newsroom/autonomy/schema.py newsroom/quality/article_score.py newsroom/quality/component_audit.py RTFCLMGZN_PULSE_SCAN.bat SETUP_PULSE_SCHEDULE.bat
if errorlevel 1 goto :fail
git diff --cached --stat
echo.

echo === Committing ===
git commit -F SHIP_VISUAL_SYSTEM_MSG.txt
if errorlevel 1 goto :fail

echo.
echo === Pushing to origin/main ===
git push origin main
if errorlevel 1 goto :fail

echo.
echo === Waiting for the Cloudflare deploy (cache-buster should reach b=248) ===
for /l %%i in (1,1,20) do (
  curl -s https://rtfclmgzn.com/ | findstr /c:"?b=248" >nul 2>nul
  if not errorlevel 1 (
    echo   Deploy landed: b=248 is live.
    goto :done
  )
  echo   ...not yet ^(check %%i of 20^)
  timeout /t 8 /nobreak >nul
)
echo   WARNING: b=248 not seen after ~160s. The push succeeded; Cloudflare may still be building.
goto :done

:fail
echo.
echo FAILED -- nothing was pushed. Fix the error above and re-run.
echo If the commit already succeeded and only the push failed, just run: git push origin main
exit /b 1

:done
echo.
echo Done. Delete SHIP_VISUAL_SYSTEM.bat and SHIP_VISUAL_SYSTEM_MSG.txt now.
exit /b 0
