@echo off
title 啟動 BlockNote 開發環境
cd /d "%~dp0"

echo [系統] 正在準備啟動環境...
echo [系統] 前端          Port: 5173
echo [系統] 文件轉換伺服器 Port: 3001
echo [系統] 備份後端       Port: 3000
echo.

:: 啟動前端 Vite
echo [1/3] 啟動前端...
start "Frontend - Port 5173" cmd /k "npm run dev"

:: 稍等讓 Vite 初始化
timeout /t 2 /nobreak > nul

:: 啟動文件轉換伺服器 (docx → md, port 3001)
echo [2/3] 啟動文件轉換伺服器...
start "Convert Server - Port 3001" cmd /k "node server.js"

:: 啟動備份後端 (Google Drive, port 3000)
echo [3/3] 啟動備份後端...
start "Backup Backend - Port 3000" cmd /k "cd blocknote-backend && node server.js"

:: 等待伺服器就緒後自動開啟瀏覽器
timeout /t 4 /nobreak > nul
echo.
echo [成功] 所有服務已啟動，開啟瀏覽器...
start http://localhost:5173

echo.
echo  前端:    http://localhost:5173
echo  轉換:    http://localhost:3001
echo  備份:    http://localhost:3000
echo.
echo  關閉所有服務請執行 stop.bat
pause
