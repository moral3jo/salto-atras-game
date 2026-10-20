@echo off
rem Arranca SALTO ATRÁS y lo abre en el navegador.
cd /d "%~dp0"
if not exist node_modules call npm install
start "" http://localhost:5182/
call npx vite --port 5182
