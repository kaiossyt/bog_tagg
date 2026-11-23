@echo off
echo === GT Admin Panel Build (from network share) ===
echo.
echo Step 1: Copying to local drive...
if exist "C:\admin-panel-cache" rmdir /s /q "C:\admin-panel-cache"
xcopy /E /I /Y "%~dp0." "C:\admin-panel-cache" >nul
echo.
echo Step 2: Installing and building on C:\admin-panel-cache ...
pushd C:\admin-panel-cache
call npm install
if %ERRORLEVEL% NEQ 0 (popd && echo npm install failed && pause && exit /b 1)
call npm run build
if %ERRORLEVEL% NEQ 0 (popd && echo Build failed && pause && exit /b 1)
popd
echo.
echo Step 3: Copying build output to C:\New folder (3)\admin-dist...
if exist "%~dp0..\admin-dist" rmdir /s /q "%~dp0..\admin-dist"
xcopy /E /I /Y "C:\admin-panel-cache\dist" "%~dp0..\admin-dist" >nul
echo.
echo Done! Restart the backend: node server.js
pause
