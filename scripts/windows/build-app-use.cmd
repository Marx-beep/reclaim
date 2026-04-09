@echo off
setlocal EnableExtensions
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-app-use.ps1"
exit /b %errorlevel%
