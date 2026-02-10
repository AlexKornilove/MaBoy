@echo off
SETLOCAL EnableDelayedExpansion

echo [Tasks Manager] Checking dependencies...
if not exist node_modules (
    echo [Tasks Manager] Installing dependencies...
    call npm install
)

echo [Tasks Manager] Starting server on port 8081...
node server.js
