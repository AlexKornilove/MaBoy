#!/bin/bash
# MaBoy Hub Startup Script for Linux

# Ensure node_modules exist and have correct permissions
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Hub..."
    npm install
else
    # Fix permissions for all projects in MaBoy (especially if folders were copied from Windows)
    echo "Ensuring execution permissions for all MaBoy projects..."
    # Find all node_modules/.bin directories in the parent MaBoy folder and chmod them
    find .. -name ".bin" -type d -path "*/node_modules/*" -exec chmod +x -R {} \; 2>/dev/null

    # Test for Hub's own binary compatibility
    if ! node -e "require('express')" >/dev/null 2>&1; then
        echo "⚠️ Error: Hub dependencies appear to be incompatible with Linux."
        echo "Performing clean reinstall of Hub node_modules..."
        rm -rf node_modules package-lock.json
        npm install
    fi
fi

# Cleanup potentially blocked ports (AHK: 3000, Warframe: 3001/5173, Hub: 8080)
echo "Cleaning up ports (3000, 3001, 5173, 8080)..."
for port in 3000 3001 5173 8080; do
    if command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp >/dev/null 2>&1
    elif command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 >/dev/null 2>&1
    fi
done

# Run the server
echo "Starting Hub server..."
node server.js
