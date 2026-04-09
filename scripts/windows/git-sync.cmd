@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-sync.ps1" %*
set EXIT_CODE=%ERRORLEVEL%

if not %EXIT_CODE%==0 (
  echo [reclaim-git] Git sync failed with exit code %EXIT_CODE%.
)

exit /b %EXIT_CODE%
