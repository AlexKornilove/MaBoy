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

    # Test for compatibility (basic check for valid node_modules)
    if ! node -e "require('telegraf')" >/dev/null 2>&1; then
        echo "⚠️ Error: Dependencies appear to be incompatible with Linux."
        echo "Performing clean reinstall of node_modules..."
        rm -rf node_modules package-lock.json
        npm install
    fi
fi

# Run the project
echo "Starting Schedule Bot..."
node src/index.js
