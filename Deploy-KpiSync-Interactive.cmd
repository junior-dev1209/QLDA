@echo off
setlocal
cd /d "%~dp0"

echo Deploy kpi-sync len Supabase.
echo Yeu cau: CLI da dang nhap bang Supabase-Login.cmd va tai khoan co quyen Developer/Owner.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-KpiSync.ps1"
set "result=%ERRORLEVEL%"
echo.
if "%result%"=="0" (
  echo Deploy va kiem tra sau deploy da thanh cong.
) else (
  echo Deploy that bai, ma loi %result%. Khong co thay doi nao duoc coi la da hoan tat.
)
pause
exit /b %result%
