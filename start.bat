@echo off
title BlockNote Dev Environment
cd /d "%~dp0"

echo Starting BlockNote servers...
echo Frontend   : http://localhost:5173
echo Convert    : http://localhost:3001
echo Backup     : http://localhost:3000
echo.

:: Start frontend (Vite)
echo [1/3] Starting frontend...
start "Frontend - Port 5173" cmd /k "npm run dev"

timeout /t 2 /nobreak > nul

:: Start docx conversion server (port 3001)
echo [2/3] Starting convert server...
start "Convert Server - Port 3001" cmd /k "node server.js"

:: Start backup backend (port 3000)
echo [3/3] Starting backup backend...
start "Backup Backend - Port 3000" cmd /k "cd blocknote-backend && node server.js"

:: Wait then open browser
timeout /t 4 /nobreak > nul
echo.
echo All servers started. Opening browser...
start http://localhost:5173

echo.
echo  Frontend : http://localhost:5173
echo  Convert  : http://localhost:3001
echo  Backup   : http://localhost:3000
echo.
echo  Run stop.bat to shut down all services.
pause
