#!/bin/bash
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     Bull Sale Check-In System        ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Starting server..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
  echo ""
fi

node server.js
