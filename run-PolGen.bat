@echo off
setlocal enabledelayedexpansion
title PolGen
cd /d "%~dp0"

if not exist env\python.exe (
    echo Error: Virtual environment not found or incomplete.
    echo Please run 'run-PolGen-installer.bat' first to set up the environment.
    pause
    exit /b 1
)

set PYTHON=env\python.exe
set ONLINE_SCRIPT=app.py
set OFFLINE_SCRIPT=app_offline.py

call :check_internet_connection
call :running_interface
exit /b 0

:check_internet_connection
echo Checking internet connection...
powershell -Command "Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet" >nul 2>&1 && (
    echo Connection to 8.8.8.8 successful
    set "INTERNET_AVAILABLE=1"
    goto :check_end
)
powershell -Command "Test-Connection -ComputerName microsoft.com -Count 1 -Quiet" >nul 2>&1 && (
    echo Connection to microsoft.com successful
    set "INTERNET_AVAILABLE=1"
    goto :check_end
)
echo No internet connection detected
set "INTERNET_AVAILABLE=0"
:check_end
echo.
exit /b 0

:running_interface
cls
echo ==== Starting Application ====

if not exist %ONLINE_SCRIPT% (
    echo Critical Error: Main script %ONLINE_SCRIPT% not found!
    pause
    exit /b 1
)

if "%INTERNET_AVAILABLE%"=="0" (
    if not exist %OFFLINE_SCRIPT% (
        echo Critical Error: Offline script %OFFLINE_SCRIPT% not found!
        pause
        exit /b 1
    )
    echo Starting in OFFLINE mode...
    %PYTHON% %OFFLINE_SCRIPT% --open
) else (
    echo Starting in ONLINE mode...
    %PYTHON% %ONLINE_SCRIPT% --open
)

if errorlevel 1 (
    echo Error: Application failed to start (Error code: %errorlevel%)
    pause
    exit /b 1
)

exit /b 0
