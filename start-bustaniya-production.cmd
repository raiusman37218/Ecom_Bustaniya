@echo off
cd /d "D:\Bustaniya"
echo Building latest Bustaniya production files...
"C:\Program Files\nodejs\npm.cmd" run build
if errorlevel 1 (
  echo.
  echo Build failed. Check the message above, then press any key to close.
  pause >nul
  exit /b 1
)
echo.
echo Starting Bustaniya production server on http://localhost:3000
"C:\Program Files\nodejs\node.exe" scripts\start-next-with-env.js start
echo.
echo Server stopped. Check the message above, then press any key to close.
pause >nul
