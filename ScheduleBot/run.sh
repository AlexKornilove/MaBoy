#!/bin/bash
# Schedule Bot Startup Script for Linux

# Ensure node_modules exist and have correct permissions
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Schedule Bot..."
    npm install
else
    # Fix permissions for binaries (especially if copied from Windows)
    echo "Fixing permissions for Schedule Bot binaries..."
    chmod +x -R node_modules/.bin 2>/dev/null
fi

# Run the project
echo "Starting Schedule Bot..."
node src/index.js
