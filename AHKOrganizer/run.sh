#!/bin/bash
# AHK Organizer Startup Script for Linux

# Ensure node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for AHK Organizer..."
    npm install
fi

# Run the server
echo "Starting AHK Organizer server..."
node server/index.js
