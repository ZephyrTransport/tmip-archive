#!/bin/bash
set -euo pipefail

# Local ZEPHYR website code location
ZEPHYR=~/git/zephyr-site

npm run build
rm -f ../tmip-archive-assets/index*
cp dist/assets/index*css $ZEPHYR/tmip-archive-assets/index.css
cp dist/assets/index*js $ZEPHYR/tmip-archive-assets/index.js

