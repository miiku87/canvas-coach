@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js puuttuu. Asenna se osoitteesta https://nodejs.org ja aja ensin Asenna.bat.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Aja ensin Asenna.bat.
  pause
  exit /b 1
)
call npm start
pause
