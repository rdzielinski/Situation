#!/bin/bash

echo "🧹 Cleaning up and restarting..."
echo ""

# Kill any running node processes
echo "1. Stopping any running Node servers..."
pkill -f "node server/index.js" 2>/dev/null || echo "   No running servers found"

# Clear data cache
echo ""
echo "2. Clearing cached data..."
rm -f data/*.json 2>/dev/null
echo "   ✅ Data cache cleared"

# Clear Node module cache (just to be safe)
echo ""
echo "3. Reinstalling dependencies..."
npm install

echo ""
echo "4. Ready to start!"
echo ""
echo "Now run: npm start"
echo ""
