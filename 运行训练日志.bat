@echo off
title Training Log
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)

echo Starting servers...
echo.
echo   Local:    http://localhost:5173
echo   Backend:  http://localhost:3001

REM Find LAN IP for mobile access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LAN_IP=%%a
    goto :found
)
:found
set LAN_IP=%LAN_IP: =%
if not "%LAN_IP%"=="" (
    echo   Mobile:   http://%LAN_IP%:5173
    echo.
    echo [Phone] Open the Mobile URL above in Chrome,
    echo          then menu ^> "Add to Home screen".
) else (
    echo.
    echo [Note] Could not detect LAN IP.
    echo        Run 'ipconfig' to find your IP manually.
)

echo.
echo Press Ctrl+C to stop all servers.
echo.

timeout /t 2 /nobreak >nul
start "" http://localhost:5173

call npm run dev:all
pause
