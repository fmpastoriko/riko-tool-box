#!/bin/bash
set -e
cd "$(dirname "$0")/.."
git pull
npm ci
npm run build
sudo systemctl restart riko-tool-box.service
echo "Deploy complete."
