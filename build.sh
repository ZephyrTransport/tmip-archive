#!/bin/bash
set -euo pipefail

npm run build
rm -f ../tmip-archive-assets/index*
cp dist/assets/index*css ../tmip-archive-assets/index.css
cp dist/assets/index*js ../tmip-archive-assets/index.js

