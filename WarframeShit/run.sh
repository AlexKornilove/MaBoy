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

    # Thorough check for binary compatibility (rollup/vite native parts)
    if ! node -e "require('rollup/dist/native.js')" >/dev/null 2>&1; then
        echo "⚠️ Error: Dependencies are incompatible with Linux (Rollup native module missing)."
        echo "Performing clean reinstall of node_modules..."
        rm -rf node_modules package-lock.json
        npm install
    fi
fi

# Cleanup ports 3001 and 5173 if blocked
echo "Ensuring ports 3001 and 5173 are free..."
for port in 3001 5173; do
    if command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp >/dev/null 2>&1
    elif command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port | xargs kill -9 >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ss -lptn "sport = :$port" | grep -oP '(?<=pid=)\d+' | xargs kill -9 >/dev/null 2>&1
    fi
done

# Run the dev server
echo "Starting Warframe Collections dev server..."
npm run dev
