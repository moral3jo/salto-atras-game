@echo off
rem Arranca Guionista y lo abre en el navegador.
cd /d "%~dp0"
if not exist node_modules call npm install
start "" http://localhost:5181/
call npx vite --port 5181
