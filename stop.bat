@echo off
title Stop BlockNote Dev Environment
cd /d "%~dp0"

echo Stopping all dev servers...
echo.

:: Kill processes on ports 5173, 3001, 3000
for %%p in (5173 3001 3000) do (
    echo Closing port %%p...
    powershell -Command "Get-NetTCPConnection -LocalPort %%p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
)

echo.
echo All services stopped.
pause
