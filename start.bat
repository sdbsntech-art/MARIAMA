@echo off
title SoutenancePro - ESP-UCAD
echo.
echo  ================================================
echo   SoutenancePro  -  ESP-UCAD DSECG2
echo  ================================================
echo.

echo  [1/2] Demarrage service securite Python (port 5000)...
start "Securite Python" cmd /k "cd /d "%~dp0security" && python main.py"

timeout /t 3 /nobreak >nul

echo  [2/2] Demarrage backend Node.js (port 3000)...
start "Backend Node.js" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak >nul

echo.
echo  ================================================
echo   Application demarree !
echo.
echo   Interface  :  http://localhost:3000
echo   API        :  http://localhost:3000/api
echo   Securite   :  http://localhost:5000/docs
echo.
echo   Login  :  admin
echo   Mdp    :  admin123
echo  ================================================
echo.
start http://localhost:3000
pause
