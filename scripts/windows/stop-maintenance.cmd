@echo off
setlocal EnableExtensions

echo [reclaim] Stopping processes on ports 3000 and 8000...
call :kill_port 3000
call :kill_port 8000
echo [reclaim] Done.
exit /b 0

:kill_port
set "PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"0.0.0.0:%PORT% .*LISTENING"') do (
  echo [reclaim] Killed PID %%P on port %PORT%
  taskkill /PID %%P /F >nul 2>nul
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"\[::\]:%PORT% .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>nul
)
exit /b 0

