@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  SETUP BILLING - adds the billing columns, creates the tables, loads your codes.
REM  Safe to run as many times as you like.
REM
REM  THREE BUGS KILLED THE EARLIER VERSIONS OF THIS FILE. Do not "tidy" any of the
REM  fixes away.
REM
REM  1. LF line endings. cmd read the breaks as garbage ('tlocal' is not
REM     recognized...) and the script died halfway. This file MUST stay CRLF.
REM     .gitattributes marks *.bat as text eol=crlf for exactly this reason.
REM
REM  2. Missing CALL. On Windows "wrangler" is wrangler.CMD - a batch file. One
REM     batch file running another WITHOUT "call" transfers control and NEVER
REM     RETURNS: the parent script just ends. Step 1 ran, printed its error, and
REM     the script was already dead. Every wrangler line below is prefixed CALL.
REM
REM  3. ALTERs run as a file. D1 aborts a whole .sql file on the first error and
REM     rolls it back. users.stripe_customer_id already existed, so that ALTER
REM     always failed and took plan_source and plan_expires_at down with it - which
REM     meant voucher redemption burned the code and then could not write the plan.
REM     The three ALTERs are now three separate --command calls, so one failing
REM     cannot affect the others.
REM ============================================================================

echo.
echo   RTFCLMGZN - billing setup
echo.

where wrangler >nul 2>nul
if errorlevel 1 (
  echo   ERROR: wrangler is not installed.
  echo   Run:  npm install -g wrangler
  echo   Then: wrangler login
  echo.
  pause
  exit /b 1
)

echo   [1/4] Adding the billing columns to users, one at a time...
echo         ^("duplicate column name" means that one is already there - fine^)
echo.
call wrangler d1 execute rtfclmgzn --remote --command "ALTER TABLE users ADD COLUMN plan_source TEXT"
call wrangler d1 execute rtfclmgzn --remote --command "ALTER TABLE users ADD COLUMN plan_expires_at TEXT"
call wrangler d1 execute rtfclmgzn --remote --command "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT"
echo.

echo   [2/4] Creating the billing tables...
echo.
call wrangler d1 execute rtfclmgzn --remote --file=db/002b_billing_tables.sql
if errorlevel 1 (
  echo.
  echo   Tables failed. Nothing else works until this passes. Stopping.
  pause
  exit /b 1
)
echo.

echo   [3/4] Loading your voucher codes...
echo         ^("UNIQUE constraint failed" means they are already in - fine^)
echo.
call wrangler d1 execute rtfclmgzn --remote --file=agents/billing/starter_vouchers.sql
echo.

echo   [4/4] Verifying. You want to see plan_source and plan_expires_at listed,
echo         and one RTFC-FOUNDER row.
echo.
call wrangler d1 execute rtfclmgzn --remote --command "PRAGMA table_info(users)"
call wrangler d1 execute rtfclmgzn --remote --command "SELECT code, kind, active FROM vouchers WHERE code='RTFC-FOUNDER'"

echo.
echo   ============================================================
echo     Enter RTFC-FOUNDER at rtfclmgzn.com ^> Account ^> Have a code?
echo.
echo     All 57 codes:  agents\billing\starter_vouchers.csv
echo.
echo     If a code ever reports "fully claimed" but the account is still
echo     free, the grant failed after the code was burned. Reset it:
echo       wrangler d1 execute rtfclmgzn --remote --command ^
echo         "DELETE FROM voucher_redemptions WHERE code='RTFC-FOUNDER'"
echo       wrangler d1 execute rtfclmgzn --remote --command ^
echo         "UPDATE vouchers SET redeemed_count=0 WHERE code='RTFC-FOUNDER'"
echo   ============================================================
echo.
pause
