#!/bin/bash

echo "[Tasks Manager] Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "[Tasks Manager] Installing dependencies..."
    npm install
fi

echo "[Tasks Manager] Starting server on port 8081..."
node server.js
