#!/bin/sh
# Makes a throwaway copy of the dashboard for the demo screenshots, never touching the original.
#   sh setup-copy.sh <dashboard repo> <work dir> [ics url]
# Copies tracked files only (git archive), clones node_modules, moves the home location to a
# public one, adds the demo weather hook and writes a .dev.vars with fresh random keys.
set -eu
REPO=$1
WORK=$2
ICS=${3:-http://127.0.0.1:5288/calendar.ics}
HERE=$(cd "$(dirname "$0")" && pwd)

mkdir -p "$WORK"
git -C "$REPO" archive HEAD dashboard | tar -x -C "$WORK"
cp -Rc "$REPO/dashboard/node_modules" "$WORK/dashboard/node_modules" 2>/dev/null || (cd "$WORK/dashboard" && npm ci)
rm -rf "$WORK/dashboard/node_modules/.vite"
python3 "$HERE/patch-copy.py" "$WORK/dashboard"

# Fresh keys for this copy only; the screenshot script reads them back from here.
umask 077
{
  echo "DASH_KEY=$(openssl rand -hex 24)"
  echo "CLAUDE_PUSH_KEY=$(openssl rand -hex 24)"
  echo "OUTLOOK_ICS_URL=$ICS"
} > "$WORK/dashboard/.dev.vars"
echo "copy ready in $WORK/dashboard"
