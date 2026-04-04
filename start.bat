@echo off
echo.
echo =========================================================
echo   RecoMinds — Full 3-Tier Stack Startup
echo =========================================================
echo.

echo [1/5] Checking MongoDB...
echo       Ensure MongoDB is running on mongodb://localhost:27017
echo.

echo [2/5] Starting Python ML Backend (port 8001)...
echo       Libraries: sentence-transformers, ChromaDB, rank-bm25, LightGBM, scipy
start "RecoMinds ML Backend" cmd /k "cd ml_backend && python run.py"
echo       Waiting 8s for model to load...
timeout /t 8 /nobreak >nul

echo.
echo [3/5] Starting Express Backend (port 5000)...
start "RecoMinds Backend" cmd /k "cd backend && node app.js"
timeout /t 3 /nobreak >nul

echo.
echo [4/5] Seed database (first run only)...
echo       Run manually if needed: cd backend ^&^& npm run seed
echo.

echo [5/5] Starting React Frontend (port 5173)...
start "RecoMinds Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================================
echo   All services started!
echo.
echo   React Frontend  : http://localhost:5173
echo   Express API     : http://localhost:5000/api/health
echo   Python ML API   : http://localhost:8001/health
echo   ML API Docs     : http://localhost:8001/docs
echo =========================================================
echo.
echo   Demo Credentials:
echo   Recruiter: priya@google.com / Google@123
echo   Candidate: (any seed email) / Password@123
echo.
pause
