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
fi

# Run the server
echo "Starting Hub server..."
node server.js
