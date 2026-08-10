@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
cd /d "%~dp0"
set LOG=DIAGNOSE_LOG.txt

REM ============================================================================
REM  Read-only. Commits nothing, pushes nothing, changes nothing.
REM  Runs every SHIP_ALL pre-flight INDEPENDENTLY -- it never stops at the first
REM  failure, which is exactly what SHIP_ALL does and why you could not see which
REM  check was the problem. Writes everything to DIAGNOSE_LOG.txt.
REM  Run it, then tell me it is done. I read the log off your disk directly.
REM ============================================================================

> "%LOG%" echo RTFCLMGZN DIAGNOSE
>>"%LOG%" echo ==================
>>"%LOG%" echo.

call :sec "ENVIRONMENT"
>>"%LOG%" 2>&1 echo --- where python ---
>>"%LOG%" 2>&1 where python
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!
>>"%LOG%" 2>&1 echo --- python --version ---
>>"%LOG%" 2>&1 python --version
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!
>>"%LOG%" 2>&1 echo --- where py ---
>>"%LOG%" 2>&1 where py
>>"%LOG%" 2>&1 echo --- where git ---
>>"%LOG%" 2>&1 where git
>>"%LOG%" 2>&1 echo --- where curl ---
>>"%LOG%" 2>&1 where curl
>>"%LOG%" 2>&1 echo --- cwd ---
>>"%LOG%" 2>&1 cd

call :sec "FREE DISK (SHIP_ALL requires more than 400 MB)"
>>"%LOG%" 2>&1 python -c "import shutil;u=shutil.disk_usage('.');print('free MB', u.free//(1024*1024));print('total MB', u.total//(1024*1024))"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "GIT"
>>"%LOG%" 2>&1 git rev-parse --abbrev-ref HEAD
>>"%LOG%" 2>&1 git log --oneline -6
>>"%LOG%" 2>&1 echo --- remotes ---
>>"%LOG%" 2>&1 git remote -v
>>"%LOG%" 2>&1 echo --- working tree ---
>>"%LOG%" 2>&1 git status --short
>>"%LOG%" 2>&1 echo --- ahead/behind origin/main ---
>>"%LOG%" 2>&1 git rev-list --left-right --count origin/main...HEAD

call :sec "FILES ON DISK"
>>"%LOG%" 2>&1 python -c "import os;[print(str(os.path.getsize(f)).rjust(9), f) if os.path.exists(f) else print('  MISSING', f) for f in ('web/assets/app.js','web/assets/styles.css','web/index.html','web/data/guides.js','web/data/worldmap.js','web/data/figures.js','web/data/resolutions.js','functions/api/geo.js','newsroom/quality/component_audit.py','newsroom/schemas/article-draft.json')]"

call :sec "CACHE-BUSTER IN index.html"
>>"%LOG%" 2>&1 python -c "import re,io;s=io.open('web/index.html',encoding='utf-8',newline='').read();print('b values found:', sorted(set(re.findall(r'\?b=(\d+)',s))))"

call :sec "PRE-FLIGHT 1 - article-draft.json"
>>"%LOG%" 2>&1 python -c "import json;json.load(open('newsroom/schemas/article-draft.json',encoding='utf-8'));print('OK valid JSON')"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 2 - python files parse"
>>"%LOG%" 2>&1 python -c "import ast;[ast.parse(open(f,encoding='utf-8').read()) for f in ('newsroom/autonomy/schema.py','newsroom/quality/article_score.py','newsroom/quality/component_audit.py')];print('OK parse clean')"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 3 - UTF-8 mojibake"
>>"%LOG%" 2>&1 python -c "import io;bad=[f for f in ('web/index.html','web/assets/app.js','web/assets/styles.css') if io.open(f,encoding='utf-8',errors='replace').read().count(chr(226)+chr(8364))];print('OK clean' if not bad else 'FAIL mojibake in '+repr(bad))"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 4 - new files present"
>>"%LOG%" 2>&1 python -c "import os;m=[f for f in ('web/data/worldmap.js','functions/api/geo.js','web/data/figures.js','web/data/resolutions.js') if not os.path.exists(f)];print('OK all present' if not m else 'FAIL missing '+repr(m))"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 5 - worldmap.js"
>>"%LOG%" 2>&1 python -c "import json,io;s=io.open('web/data/worldmap.js',encoding='utf-8').read();d=json.loads(s[s.index('{'):].rstrip().rstrip(';'));print('OK',len(d['paths']),'countries')"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 6 - guides.js"
>>"%LOG%" 2>&1 python -c "import json,io;s=io.open('web/data/guides.js',encoding='utf-8').read();g=json.loads(s[s.index('['):s.rindex(']')+1]);bad=[x['slug'] for x in g if not any(b.get('type')=='procedure' for b in x.get('body') or [])];print('OK',len(g),'guides, all carry a procedure' if not bad else 'FAIL no procedure in '+repr(bad))"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 7 - component invariant"
>>"%LOG%" 2>&1 python -c "import json;s=open('web/data/newsroom-articles.js',encoding='utf-8').read();a=json.loads(s[s.index('['):].rstrip().rstrip(';'));C={'chart','compare','timeline','entity','scorecard','ledger','beforeafter','spectrum','flow','keyfacts','stakes','sourcecheck','stat','model','rank','counter','document','procedure','snippet','decide','pitfalls'};bad=[x['slug']+':'+b['type'] for x in a for b in x['body'] if b['type'] in C and 'text' in b];print('OK none carry top-level text' if not bad else 'FAIL '+repr(bad))"
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "PRE-FLIGHT 8 - component_audit"
>>"%LOG%" 2>&1 python -m newsroom.quality.component_audit
>>"%LOG%" 2>&1 echo errorlevel=!errorlevel!

call :sec "LIVE SITE"
>>"%LOG%" 2>&1 curl -s -o nul -w "index.html      http_code=%%{http_code}\n" https://rtfclmgzn.com/
>>"%LOG%" 2>&1 curl -s -o nul -w "data/worldmap.js http_code=%%{http_code}\n" https://rtfclmgzn.com/data/worldmap.js
>>"%LOG%" 2>&1 curl -s -o nul -w "data/figures.js  http_code=%%{http_code}\n" https://rtfclmgzn.com/data/figures.js
>>"%LOG%" 2>&1 curl -s -o nul -w "api/geo          http_code=%%{http_code}\n" https://rtfclmgzn.com/api/geo

>>"%LOG%" echo.
>>"%LOG%" echo DONE.
echo.
echo Wrote DIAGNOSE_LOG.txt -- nothing was committed, pushed or changed.
echo Tell Claude it is done.
exit /b 0

:sec
>>"%LOG%" echo.
>>"%LOG%" echo ============================================================
>>"%LOG%" echo  %~1
>>"%LOG%" echo ============================================================
exit /b 0
