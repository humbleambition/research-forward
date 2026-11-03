#!/usr/bin/env bash
# research-forward: runs hourly from cron (installed as ~/research-update.sh by setup-vps.sh).
# Pulls the repo and copies site/ files into ~/striatum/site/research/ with cp only.
# Never deletes anything there and never touches other folders.
set -euo pipefail
SRC="$HOME/research-forward-src"
DEST="$HOME/striatum/site/research"
git -C "$SRC" pull -q --ff-only
mkdir -p "$DEST"
find "$SRC/site" -maxdepth 1 -type f -exec cp -f {} "$DEST/" \;
echo "$(date -Is) research updated ($(git -C "$SRC" rev-parse --short HEAD))"
