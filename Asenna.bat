@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js puuttuu. Asenna se osoitteesta https://nodejs.org ja tuplaklikkaa tata tiedostoa uudelleen.
  pause
  exit /b 1
)
node scripts\setup.mjs
pause
