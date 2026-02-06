#!/bin/bash
# MaBoy Hub Startup Script for Linux

# Ensure node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies for Hub..."
    npm install
fi

# Run the server
echo "Starting Hub server..."
node server.js
