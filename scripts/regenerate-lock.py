#!/usr/bin/env python3
import subprocess
import os

os.chdir('/vercel/share/v0-project')

# Run npm install to regenerate the lock file
print("Regenerating package-lock.json with npm install...")
result = subprocess.run(['npm', 'install'], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print(f"Return code: {result.returncode}")
