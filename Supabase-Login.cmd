@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0tools\supabase-cli\supabase.exe" (
  echo Supabase CLI was not found in tools\supabase-cli.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Continue'; Write-Host 'Signing in to Supabase. Complete the browser authorization when it opens.'; & '%~dp0tools\supabase-cli\supabase.exe' --output-format text login; $result=$LASTEXITCODE; if ($result -eq 0) { Write-Host 'Supabase CLI login completed.' } else { Write-Host ('Supabase CLI login failed with exit code ' + $result) }; Read-Host 'Press Enter to close this window'"
exit /b 0
