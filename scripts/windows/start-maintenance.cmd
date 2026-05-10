@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-maintenance.ps1" %*
exit /b %errorlevel%

