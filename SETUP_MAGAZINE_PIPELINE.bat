@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  One-time: registers the four-phase Magazine Pipeline as Windows Scheduled
REM  Tasks. Run this file once (right-click -> Run as administrator is safest;
REM  a non-admin register also works for the current user on most setups).
REM  The existing Cycle A/B/C, Pulse Scan and breaking-scan tasks are untouched.
REM
REM  The schedule:
REM
REM    RTFCLMGZN Magazine Gather   25th, 26th, 27th   06:00   (three passes)
REM    RTFCLMGZN Magazine Curate   28th               06:00
REM    RTFCLMGZN Magazine Build    29th               06:00
REM    RTFCLMGZN Magazine Verify   30th               06:00
REM
REM  ---------------------------------------------------------------------------
REM  SHORT MONTHS — how February is handled, honestly.
REM
REM  Windows will happily accept "/d 30" for every month and then simply never
REM  fire it in a month that has no 30th. February has no 30th ever and no 29th
REM  in a common year, so the BUILD and VERIFY phases would silently not run for
REM  the February issue — the pipeline would gather and curate and then stop,
REM  and nobody would find out until someone asked where the issue was.
REM
REM  The 25th-28th are safe: every month has them, February included. So only
REM  BUILD (29th) and VERIFY (30th) need cover, and they get two extra tasks:
REM
REM    RTFCLMGZN Magazine Build (Feb)    last day of FEBRUARY   12:00
REM    RTFCLMGZN Magazine Verify (Feb)   1 MARCH                06:00
REM
REM  So in February the pipeline compresses: curate on the 28th at 06:00, build
REM  the same day at 12:00 (or the 29th in a leap year, whichever is the last
REM  day), and verify on the morning of 1 March. pipeline_state.py's
REM  resolve_cycle_month() maps any run on the 1st-4th back to the PREVIOUS
REM  month, which is why the March 1 verify still opens February's state file
REM  rather than starting an empty March one.
REM
REM  Two firings can therefore land on the same phase in a leap year (Feb 29
REM  matches both "/d 29" and "last day"). That is safe by construction, twice
REM  over: the .bat's per-phase 20-hour catch-up gate skips the second, and
REM  pipeline_state.py refuses any phase already marked complete for the cycle.
REM  Both refusals are logged rather than silent.
REM
REM  Alternative considered and rejected: shifting everything to 22nd-27th so no
REM  task ever needs a fallback. It works, but it pulls GATHER out of the last
REM  week of the month, which is the whole point — late-breaking stories in the
REM  final days are exactly what the three passes exist to catch.
REM  ---------------------------------------------------------------------------
REM
REM  To remove everything later:
REM    schtasks /delete /tn "RTFCLMGZN Magazine Gather 1" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Gather 2" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Gather 3" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Curate" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Build" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Verify" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Build (Feb)" /f
REM    schtasks /delete /tn "RTFCLMGZN Magazine Verify (Feb)" /f
REM ============================================================================

set "RUNNER=%~dp0RTFCLMGZN_MAGAZINE_PIPELINE.bat"
if not exist "%RUNNER%" (
  echo.
  echo RTFCLMGZN_MAGAZINE_PIPELINE.bat is not next to this file.
  echo Put both in the repo root and run this again.
  pause
  exit /b 1
)

REM --- retire the old single-shot draft task -----------------------------------
REM  It fired on the 1st and did gather+curate+build+verify in one session, which
REM  is the design this pipeline replaces. Leaving it registered would produce a
REM  second, uncoordinated draft of the same issue a day after VERIFY finished.
REM a partially-successful earlier run may have left this behind
schtasks /delete /tn "RTFCLMGZN Magazine Gather" /f >nul 2>nul

schtasks /query /tn "RTFCLMGZN Magazine Draft" >nul 2>nul
if not errorlevel 1 (
  echo Removing the old single-shot task "RTFCLMGZN Magazine Draft"...
  schtasks /delete /tn "RTFCLMGZN Magazine Draft" /f >nul
)

set "FAILED=0"

REM --- GATHER: 25th, 26th, 27th ------------------------------------------------
REM  Three passes on purpose. Pass 1 reads the month to date; passes 2 and 3 pick
REM  up late-breaking stories and revise the significance scores that moved.
REM  /sc MONTHLY takes ONE /d value. "/d 25,26,27" is WEEKLY syntax and schtasks
REM  rejects it with "Invalid value for /D option" — so the three passes are three
REM  separate tasks. They share one phase and one state file; the per-phase cooldown
REM  in the launcher and the pass counter in pipeline_state.py keep them in order.
call :mk "RTFCLMGZN Magazine Gather 1" gather "/sc monthly /d 25 /st 06:00"
call :mk "RTFCLMGZN Magazine Gather 2" gather "/sc monthly /d 26 /st 06:00"
call :mk "RTFCLMGZN Magazine Gather 3" gather "/sc monthly /d 27 /st 06:00"

REM --- CURATE: 28th ------------------------------------------------------------
call :mk "RTFCLMGZN Magazine Curate" curate "/sc monthly /d 28 /st 06:00"

REM --- BUILD: 29th (+ February fallback) ---------------------------------------
REM  06:00 because BUILD is the long one — it writes the payload and then
REM  generates every image in the issue.
call :mk "RTFCLMGZN Magazine Build" build "/sc monthly /d 29 /st 06:00"
call :mk "RTFCLMGZN Magazine Build (Feb)" build "/sc monthly /mo lastday /m FEB /st 12:00"

REM --- VERIFY: 30th (+ February fallback on 1 March) ---------------------------
call :mk "RTFCLMGZN Magazine Verify" verify "/sc monthly /d 30 /st 06:00"
call :mk "RTFCLMGZN Magazine Verify (Feb)" verify "/sc monthly /d 1 /m MAR /st 06:00"

if not "%FAILED%"=="0" (
  echo.
  echo %FAILED% task^(s^) FAILED to register. Try re-running this file as administrator.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Registered the RTFCLMGZN magazine pipeline:
echo.
echo    Gather   25th, 26th, 27th  06:00   three dossier passes
echo    Curate   28th              06:00   slate, ledger, page map
echo    Build    29th              06:00   payload + all the art
echo    Verify   30th              06:00   qa_scan + real-reader audit
echo.
echo    February: Build runs on the last day of Feb at 12:00 and
echo    Verify on 1 March at 06:00 - see the comments in this file.
echo ============================================================
echo.
echo This produces a DRAFT ONLY on a local git branch
echo (magazine-draft-issue-NNN) and never publishes on its own.
echo Read newsroom/releases/DRAFT-READY-issue-*.md after Verify runs,
echo then review it in a real browser before asking Claude to ship it.
echo.
echo State (this is the pipeline's memory between days):
echo   newsroom\runner\magazine-state\^<YYYY-MM^>.json
echo   Status any time:  python newsroom\runner\pipeline_state.py show
echo.
echo Logs:
echo   %LOCALAPPDATA%\RTFCLMGZN\logs\magazine-gather.log
echo   %LOCALAPPDATA%\RTFCLMGZN\logs\magazine-curate.log
echo   %LOCALAPPDATA%\RTFCLMGZN\logs\magazine-build.log
echo   %LOCALAPPDATA%\RTFCLMGZN\logs\magazine-verify.log
echo.
echo Kill switch: create newsroom\runner\PAUSED to stop every phase.
echo.
echo You can delete this setup file now.
pause
exit /b 0

REM ============================================================================
REM  :mk <task name> <phase> <schtasks schedule flags>
REM  Registers one task, replacing any existing one of the same name so this
REM  file is safe to re-run.
REM ============================================================================
:mk
set "TN=%~1"
set "PH=%~2"
set "SCHED=%~3"

schtasks /query /tn "%TN%" >nul 2>nul
if not errorlevel 1 (
  echo Updating existing task: %TN%
  schtasks /delete /tn "%TN%" /f >nul
)

schtasks /create /tn "%TN%" /tr "\"%RUNNER%\" %PH%" %SCHED% /f >nul 2>&1
if errorlevel 1 (
  echo   FAILED: %TN%
  set /a FAILED+=1
  exit /b 0
)

REM Repetition off. Windows' "run as soon as possible after a missed start" is a
REM Task Scheduler checkbox schtasks cannot set, so if the PC is off all day the
REM phase is simply missed — which is recoverable: run
REM   RTFCLMGZN_MAGAZINE_PIPELINE.bat ^<phase^>
REM by hand and the state file picks up exactly where it left off. If you do
REM enable the checkbox in taskschd.msc, catch-up firings are safe: the per-phase
REM 20-hour gate and the phase-complete check in pipeline_state.py both refuse a
REM duplicate, out loud, in the log.
schtasks /change /tn "%TN%" /ri 0 >nul 2>nul
echo   registered: %TN%  (%PH%)
exit /b 0
