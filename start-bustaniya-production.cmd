@echo off
setlocal EnableExtensions
cd /d "D:\Ecom_Bustaniya-main"

set "PORT=3000"
set "NODE=C:\Program Files\nodejs\node.exe"
set "NPM=C:\Program Files\nodejs\npm.cmd"

rem ---------------------------------------------------------------
rem  Build somewhere else first.
rem
rem  Every build rewrites all of .next/static with new content hashes
rem  and deletes the previous build's files. Doing that underneath a
rem  running server means anyone on the site during the build asks for
rem  CSS and JS that has just been deleted, gets 404s, and sees the
rem  page with no styling. Building into .next-build leaves the live
rem  site completely untouched until the moment we swap.
rem ---------------------------------------------------------------
echo.
echo [1/4] Building the new version (the live site keeps running)...
if exist ".next-build" rmdir /s /q ".next-build"
set "NEXT_DIST_DIR=.next-build"
call "%NPM%" run build
set "BUILD_FAILED=%ERRORLEVEL%"
set "NEXT_DIST_DIR="

if not "%BUILD_FAILED%"=="0" (
  echo.
  echo Build FAILED. The live site was not touched and is still running.
  echo Fix the error above, then run this again.
  if exist ".next-build" rmdir /s /q ".next-build"
  pause >nul
  exit /b 1
)

echo.
echo [2/4] Stopping the server on port %PORT% ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:"TCP.*:%PORT% .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)

rem Give Windows a moment to release the file handles on .next, or the
rem rename below fails.
"%NODE%" -e "setTimeout(()=>{},1500)" >nul 2>&1
ping -n 3 127.0.0.1 >nul 2>&1

echo.
echo [3/4] Swapping the new build in...
if exist ".next-old" rmdir /s /q ".next-old"
if exist ".next" move ".next" ".next-old" >nul
move ".next-build" ".next" >nul
if errorlevel 1 (
  echo.
  echo Swap FAILED - putting the previous build back.
  if exist ".next-old" move ".next-old" ".next" >nul
  pause >nul
  exit /b 1
)
if exist ".next-old" rmdir /s /q ".next-old"

echo.
echo [4/4] Starting Bustaniya on http://localhost:%PORT%
"%NODE%" scripts\start-next-with-env.js start

echo.
echo Server stopped. Check the message above, then press any key to close.
pause >nul
