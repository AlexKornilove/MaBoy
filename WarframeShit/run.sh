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

    # Test if vite can actually run (detects binary mismatch like @rollup/rollup-linux-x64-gnu)
    if ! ./node_modules/.bin/vite --version >/dev/null 2>&1; then
        echo "⚠️ Error: Dependencies appear to be incompatible with Linux (likely copied from Windows)."
        echo "Performing clean reinstall of node_modules..."
        rm -rf node_modules package-lock.json
        npm install
    fi
fi

# Run the dev server
echo "Starting Warframe Collections dev server..."
npm run dev
