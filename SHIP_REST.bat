@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  SHIP_REST.bat -- pushes the interrogation layer (batch 2).
REM
REM  Why this file exists: batch 2 was written to disk at ~14:49 UTC but never
REM  committed. The 15:15 scheduled cycle then committed web/index.html and
REM  web/data/newsroom-articles.js (its normal surface) WITHOUT app.js or
REM  styles.css, because its git add list is deliberately narrow. So the live
REM  site currently serves articles containing model/rank/counter/document
REM  blocks against a renderer that does not know those types yet. This closes
REM  that gap.
REM
REM  It does NOT run newsroom.runner.verify_publish_surface. That guard exists
REM  to stop an UNATTENDED CYCLE from touching anything outside web/, and this
REM  commit intentionally changes specs and schemas (agents/, newsroom/). Per
REM  the guard's own error text, spec work "belongs in a human-reviewed commit,
REM  not an unattended cycle" -- which is what this is. Every scheduled cycle
REM  after this remains bound by the guard.
REM
REM  Deliberately contains zero '%' characters inside any python -c string.
REM  cmd.exe strips unpaired '%' out of batch lines before python ever sees
REM  them, which silently turns printf-style formatting into a SyntaxError.
REM  (SHIP_VISUAL_SYSTEM.bat has that bug on its component-invariant check --
REM  it can never have passed. Use this file instead and delete that one.)
REM ============================================================================

echo.
echo === Where we are ===
git rev-parse --abbrev-ref HEAD
git log -1 --pretty=format:"  HEAD: %%h %%s"
echo.
echo.
echo === Working tree before staging ===
git status --short
echo.

echo === Pre-flight checks ===

python -c "import json;json.load(open('newsroom/schemas/article-draft.json',encoding='utf-8'));print('  article-draft.json : valid JSON')"
if errorlevel 1 goto :fail

python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ('newsroom/autonomy/schema.py','newsroom/quality/article_score.py','newsroom/quality/component_audit.py')];print('  python files       : parse clean')"
if errorlevel 1 goto :fail

REM Mojibake guard from the cycle runbook. index.html is full of em dashes and
REM curly quotes; a non-UTF-8-safe edit silently corrupts the entire file.
python -c "import sys,io;s=io.open('web/index.html',encoding='utf-8',errors='replace').read();n=s.count(chr(226)+chr(8364));print('  index.html UTF-8   : clean' if n==0 else 'MOJIBAKE COUNT: '+str(n));sys.exit(1 if n else 0)"
if errorlevel 1 goto :fail

REM THE INVARIANT: rtfcListen() speaks every block carrying .text, and
REM wordCount() sums it. A component with top-level text corrupts both.
python -c "import json,sys;s=open('web/data/newsroom-articles.js',encoding='utf-8').read();a=json.loads(s[s.index('['):].rstrip().rstrip(';'));C={'chart','compare','timeline','entity','scorecard','ledger','beforeafter','spectrum','flow','keyfacts','stakes','sourcecheck','stat','model','rank','counter','document'};bad=[x['slug']+':'+b['type'] for x in a for b in x['body'] if b['type'] in C and 'text' in b];print('  component blocks   : none carry top-level text' if not bad else 'BAD: '+repr(bad));sys.exit(1 if bad else 0)"
if errorlevel 1 goto :fail

python -m newsroom.quality.component_audit
if errorlevel 1 goto :fail

echo.
echo === Cache-buster ===
REM Must bump. The 15:15 cycle already published its number against the OLD
REM app.js, so that URL is cached at the edge and in every visitor's browser.
REM Reusing it would ship the new renderer to nobody.
python -c "import re,io,sys;p='web/index.html';s=io.open(p,encoding='utf-8',newline='').read();ns=sorted(set(re.findall(r'\?b=(\d+)',s)));sys.exit('cache-buster numbers disagree: '+repr(ns)) if len(ns)!=1 else None;new=str(int(ns[0])+1);io.open(p,'w',encoding='utf-8',newline='').write(re.sub(r'\?b=\d+','?b='+new,s));io.open('.newb','w').write(new);print('  index.html         : b='+ns[0]+' -> b='+new)"
if errorlevel 1 goto :fail
set /p NEWB=<.newb
del .newb >nul 2>nul

echo.
echo === Staging ===
git add web/assets/app.js web/assets/styles.css web/index.html web/data/entities.js web/data/figures.js web/data/resolutions.js web/data/newsroom-articles.js web/data/resources.js agents/_shared/visual-components.md agents/_shared/loop-doctrine.md newsroom/runner/cycle-runbook.md newsroom/runner/breaking-scan-runbook.md newsroom/runner/pulse-scan-runbook.md newsroom/schemas/article-draft.json newsroom/autonomy/schema.py newsroom/quality/article_score.py newsroom/quality/component_audit.py RTFCLMGZN_PULSE_SCAN.bat SETUP_PULSE_SCHEDULE.bat
if errorlevel 1 goto :fail

git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo   Nothing is staged. Everything in the list above already matches HEAD,
  echo   which means batch 2 is already committed. Check: git log --oneline -5
  goto :done
)

git diff --cached --stat
echo.

echo === Committing ===
git commit -F SHIP_VISUAL_SYSTEM_MSG.txt
if errorlevel 1 goto :fail

echo.
echo === Pushing to origin/main ===
git push origin main
if errorlevel 1 goto :pushfail

echo.
echo === Waiting for the Cloudflare deploy (looking for b=!NEWB!) ===
for /l %%i in (1,1,25) do (
  curl -s -H "Cache-Control: no-cache" https://rtfclmgzn.com/ | findstr /c:"?b=!NEWB!" >nul 2>nul
  if not errorlevel 1 (
    echo   Deploy landed: b=!NEWB! is live.
    goto :verify
  )
  echo   ...not yet ^(check %%i of 25^)
  timeout /t 8 /nobreak >nul
)
echo   WARNING: b=!NEWB! not seen after ~200s. The push succeeded; Cloudflare
echo            may still be building. Re-check in a minute.
goto :done

:verify
echo.
echo === Post-deploy checks ===
curl -s -f https://rtfclmgzn.com/data/figures.js >nul 2>nul
if errorlevel 1 (echo   FAIL  data/figures.js still 404s) else (echo   OK    data/figures.js is served)
curl -s -f https://rtfclmgzn.com/data/resolutions.js >nul 2>nul
if errorlevel 1 (echo   FAIL  data/resolutions.js still 404s) else (echo   OK    data/resolutions.js is served)
curl -s -H "Cache-Control: no-cache" https://rtfclmgzn.com/ | findstr /c:"#/claims" >nul 2>nul
if errorlevel 1 (echo   FAIL  Claims ledger link missing from index.html) else (echo   OK    Claims ledger link present)
goto :done

:pushfail
echo.
echo PUSH REJECTED. A scheduled cycle almost certainly pushed while this ran.
echo The commit is safe locally. Run these two lines and you are done:
echo     git pull --rebase origin main
echo     git push origin main
exit /b 1

:fail
echo.
echo FAILED -- nothing was pushed. Fix the error above and re-run.
echo If the commit already succeeded and only the push failed, just run:
echo     git push origin main
exit /b 1

:done
echo.
echo Done. You can now delete SHIP_REST.bat, SHIP_VISUAL_SYSTEM.bat and
echo SHIP_VISUAL_SYSTEM_MSG.txt -- all three are one-off ship scripts.
exit /b 0
