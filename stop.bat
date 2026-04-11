@echo off
title 關閉 BlockNote 開發環境
cd /d "%~dp0"

echo [系統] 正在關閉所有開發伺服器...
echo.

:: 依序關閉三個 port 上的程序
for %%p in (5173 3001 3000) do (
    echo [系統] 關閉 Port %%p...
    powershell -Command "Get-NetTCPConnection -LocalPort %%p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
)

echo.
echo [成功] 所有服務已關閉！
pause
