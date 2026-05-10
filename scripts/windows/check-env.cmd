@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-env.ps1" %*
exit /b %errorlevel%
