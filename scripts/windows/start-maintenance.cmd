@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
set "NODE_PATH=C:\Program Files\nodejs"
set "PNPM_PATH=%USERPROFILE%\AppData\Roaming\npm"
set "PYTHON_EXE=%USERPROFILE%\AppData\Local\Python\pythoncore-3.14-64\python.exe"

set "PATH=%NODE_PATH%;%PNPM_PATH%;%PATH%"
if not defined DATABASE_URL set "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reclaim"
if not defined REDIS_URL set "REDIS_URL=redis://localhost:6379"
if not defined NEXTAUTH_SECRET set "NEXTAUTH_SECRET=replace-me"
if not defined NEXTAUTH_URL set "NEXTAUTH_URL=http://localhost:3000"
if not defined SCHEDULER_BASE_URL set "SCHEDULER_BASE_URL=http://localhost:8000"

if not exist "%ROOT%\.runtime\logs" mkdir "%ROOT%\.runtime\logs" >nul 2>nul

echo [reclaim] Applying database migrations...
pushd "%ROOT%"
call pnpm.cmd --filter @reclaim/database exec prisma migrate deploy
if errorlevel 1 echo [reclaim] Warning: migrate deploy failed, continue startup.
popd

call :get_pid_on_port 8000 SCHEDULER_PID
if not defined SCHEDULER_PID (
  echo [reclaim] Starting scheduler on 8000...
  start "reclaim-scheduler" /D "%ROOT%\services\scheduler" "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
) else (
  call :is_healthy_url http://localhost:8000/health
  if errorlevel 1 (
    echo [reclaim] Scheduler unhealthy, restarting PID %SCHEDULER_PID%...
    taskkill /PID %SCHEDULER_PID% /F >nul 2>nul
    timeout /t 1 /nobreak >nul
    start "reclaim-scheduler" /D "%ROOT%\services\scheduler" "%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
  ) else (
    echo [reclaim] Scheduler already running on 8000.
  )
)

call :get_pid_on_port 3000 WEB_PID
if not defined WEB_PID (
  if not exist "%ROOT%\apps\web\.next\BUILD_ID" (
    echo [reclaim] Web build not found, building apps/web...
    pushd "%ROOT%"
    call pnpm.cmd --filter @reclaim/web build
    if errorlevel 1 (
      echo [reclaim] Web build failed.
      popd
      exit /b 1
    )
    popd
  )
  echo [reclaim] Starting web on 3000 - production mode...
  start "reclaim-web" /D "%ROOT%" pnpm.cmd --filter @reclaim/web start
) else (
  call :is_healthy_url http://localhost:3000/
  if errorlevel 1 (
    echo [reclaim] Web unhealthy, restarting PID %WEB_PID%...
    taskkill /PID %WEB_PID% /F >nul 2>nul
    timeout /t 1 /nobreak >nul
    if not exist "%ROOT%\apps\web\.next\BUILD_ID" (
      echo [reclaim] Web build not found, building apps/web...
      pushd "%ROOT%"
      call pnpm.cmd --filter @reclaim/web build
      if errorlevel 1 (
        echo [reclaim] Web build failed.
        popd
        exit /b 1
      )
      popd
    )
    start "reclaim-web" /D "%ROOT%" pnpm.cmd --filter @reclaim/web start
  ) else (
    echo [reclaim] Web already running on 3000.
  )
)

timeout /t 5 /nobreak >nul

echo [reclaim] Ready.
echo [reclaim] Frontend: http://localhost:3000/
echo [reclaim] Ops:      http://localhost:3000/ops
echo [reclaim] Scheduler docs: http://localhost:8000/docs

if /I not "%~1"=="-NoBrowser" (
  start "" "http://localhost:3000/"
  start "" "http://localhost:3000/ops"
)

exit /b 0

:is_listening
set "_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%_PORT% .*LISTENING"') do (
  exit /b 0
)
exit /b 1

:get_pid_on_port
set "PORT=%~1"
set "%~2="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "%~2=%%P"
  exit /b 0
)
exit /b 1

:is_healthy_url
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 4; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%
