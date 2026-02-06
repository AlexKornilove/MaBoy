#!/bin/bash
# Schedule Bot Startup Script for Linux

# Ensure node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Schedule Bot..."
    npm install
fi

# Run the project
echo "Starting Schedule Bot..."
node src/index.js
