@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-KpiSync.ps1" %*
exit /b %ERRORLEVEL%
