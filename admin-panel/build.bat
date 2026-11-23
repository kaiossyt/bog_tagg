@echo off
echo === GT Admin Panel Build ===
cd /d %~dp0
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (echo npm install failed! && pause && exit /b 1)
echo Building React app...
call npm run build
if %ERRORLEVEL% NEQ 0 (echo Build failed! && pause && exit /b 1)
echo Copying to backend...
if exist "C:\New folder (3)\admin-dist" rmdir /s /q "C:\New folder (3)\admin-dist"
xcopy /E /I /Y dist "C:\New folder (3)\admin-dist" >nul
echo Done! Restart the server: node server.js
pause
