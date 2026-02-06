#!/bin/bash
# Warframe Collections Startup Script for Linux

# Ensure node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Warframe Collections..."
    npm install
fi

# Run the dev server
echo "Starting Warframe Collections dev server..."
npm run dev
