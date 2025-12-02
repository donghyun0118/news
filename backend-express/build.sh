#!/bin/bash

# Exit on error
set -e

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Compile TypeScript to JavaScript
echo "Compiling TypeScript..."
npm run build

# Install Python dependencies from the news-data directory
echo "Installing Python dependencies..."
pip install -r ../news-data/requirements.txt

echo "Build script finished successfully."