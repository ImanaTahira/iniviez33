@echo off
:: Periksa apakah Node.js sudah terinstal
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js belum terinstal. Silakan instal Node.js dari https://nodejs.org/ dan coba lagi.
    exit /b 1
)

:: Navigasi ke direktori skrip
cd /d "%~dp0"

:: Instal dependensi
npm install

pause
