@echo off
setlocal

cd /d "%~dp0"

echo [OpenClawMDBuilder] Starting one-click launcher...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 8787

endlocal
