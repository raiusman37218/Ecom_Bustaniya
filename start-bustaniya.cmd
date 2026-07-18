@echo off
cd /d "D:\Ecom_Bustaniya-main"
echo Starting Bustaniya development server on http://localhost:3000
"C:\Program Files\nodejs\node.exe" scripts\start-next-with-env.js dev
echo.
echo Server stopped. Check the message above, then press any key to close.
pause >nul
