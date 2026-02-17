#!/bin/bash
set -e

echo "Regenerating package-lock.json..."
cd /vercel/share/v0-project

# Remove old lock file if it exists
if [ -f package-lock.json ]; then
  rm package-lock.json
fi

# Run npm install to create a fresh lock file
npm install

echo "Lock file regenerated successfully!"
