#!/bin/bash
# Warframe Collections Startup Script for Linux

# Ensure node_modules exist and have correct permissions
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Warframe Collections..."
    npm install
else
    # Fix permissions for binaries (especially if copied from Windows)
    echo "Fixing permissions for Warframe Collections binaries..."
    chmod +x -R node_modules/.bin 2>/dev/null
fi

# Run the dev server
echo "Starting Warframe Collections dev server..."
npm run dev
