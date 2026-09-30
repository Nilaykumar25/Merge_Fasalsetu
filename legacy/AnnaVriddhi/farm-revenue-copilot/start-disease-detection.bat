@echo off
echo ====================================
echo AnnaVriddhi Disease Detection Setup
echo ====================================
echo.

echo Starting Python ML Service...
echo.
cd backend\ml
start "Disease Detection ML Service" cmd /k "venv\Scripts\activate && python api_service.py"

timeout /t 3 /nobreak > nul

echo Starting Node.js Backend...
echo.
cd ..\..
cd backend
start "AnnaVriddhi Backend" cmd /k "npm start"

timeout /t 3 /nobreak > nul

echo Starting React Frontend...
echo.
cd ..\frontend
start "AnnaVriddhi Frontend" cmd /k "npm run dev"

echo.
echo ====================================
echo All services are starting!
echo ====================================
echo.
echo - ML Service:  http://localhost:5000
echo - Backend API: http://localhost:4000
echo - Frontend:    http://localhost:5173
echo.
echo Check the opened terminal windows for logs.
echo Close this window to keep services running.
echo.
pause
