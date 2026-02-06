#!/bin/bash
# AHK Organizer Startup Script for Linux

# Ensure node_modules exist and have correct permissions
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for AHK Organizer..."
    npm install
else
    # Fix permissions for binaries (especially if copied from Windows)
    echo "Fixing permissions for AHK Organizer binaries..."
    chmod +x -R node_modules/.bin 2>/dev/null

    # Test for binary compatibility (chokidar has native parts)
    if ! node -e "require('chokidar')" >/dev/null 2>&1; then
        echo "⚠️ Error: Dependencies appear to be incompatible with Linux (native modules error)."
        echo "Performing clean reinstall of node_modules..."
        rm -rf node_modules package-lock.json
        npm install
    fi
fi

# Run the server
echo "Starting AHK Organizer server..."
node server/index.js
