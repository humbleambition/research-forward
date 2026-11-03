#!/usr/bin/env bash
# research-forward: one-time, idempotent setup for auto-updating striatumos.consulting/research/
# Run on the server as jen:
#   curl -fsSL https://raw.githubusercontent.com/humbleambition/research-forward/main/setup-vps.sh | bash
set -euo pipefail
REPO="https://github.com/humbleambition/research-forward.git"
SRC="$HOME/research-forward-src"
cd "$HOME"

# 1. Get the repo (clone once, pull after)
if [ -d "$SRC/.git" ]; then git -C "$SRC" pull -q --ff-only; else git clone -q "$REPO" "$SRC"; fi
cp "$SRC/update.sh" "$HOME/research-update.sh"; chmod +x "$HOME/research-update.sh"

# 2. Cron: hourly at :10. Keeps every existing line (props-update.sh etc.), replaces only an older research-update.sh line.
LINE="10 * * * * $HOME/research-update.sh >> $HOME/research-refresh.log 2>&1"
{ { crontab -l 2>/dev/null || true; } | { grep -v "research-update.sh" || true; }; echo "$LINE"; } | crontab -

# 3. Update now
"$HOME/research-update.sh"
echo
echo "Done. ~/striatum/site/research/ now refreshes from GitHub every hour at :10."
crontab -l
