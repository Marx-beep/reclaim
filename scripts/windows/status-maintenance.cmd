@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0status-maintenance.ps1"
exit /b %errorlevel%

