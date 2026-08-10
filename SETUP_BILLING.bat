@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
cd /d "%~dp0"

REM ============================================================================
REM  SETUP BILLING - one-time. Creates the billing tables and loads your codes.
REM  Run this AFTER you've added the Stripe keys in Cloudflare, or before - the
REM  order doesn't matter. Safe to run twice.
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

if not exist "db\002_billing.sql" (
  echo   ERROR: db\002_billing.sql not found. Run this from the repo root.
  pause
  exit /b 1
)

echo   [1/2] Creating the billing tables...
echo         ^("duplicate column name" here is expected and harmless^)
echo.
wrangler d1 execute rtfclmgzn --remote --file=db/002_billing.sql
echo.

echo   [2/2] Loading your voucher codes...
echo.
wrangler d1 execute rtfclmgzn --remote --file=agents/billing/starter_vouchers.sql
if errorlevel 1 (
  echo.
  echo   Codes failed to load. The tables may not exist yet - check step 1 above.
  pause
  exit /b 1
)

echo.
echo   ============================================================
echo     DONE. Your codes are live.
echo.
echo     YOUR CODE:  RTFC-FOUNDER
echo     Enter it at rtfclmgzn.com  ^>  Account  ^>  Have a code?
echo.
echo     All 57 codes are listed in:
echo       agents\billing\starter_vouchers.csv
echo   ============================================================
echo.
pause
