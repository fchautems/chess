@echo off
cd /d "%~dp0"

where py >nul 2>&1
if not errorlevel 1 (
    py launch_app.py
    exit /b %errorlevel%
)

where python >nul 2>&1
if not errorlevel 1 (
    python launch_app.py
    exit /b %errorlevel%
)

echo ERREUR: Python est introuvable sur ce PC.
echo Installez Python ou ajoutez-le au PATH, puis relancez ce fichier.
pause
exit /b 1
