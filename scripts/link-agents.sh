#!/usr/bin/env bash
# Point every tool at one canonical home.
#
#   .agents/skills/   the real skills
#   .claude/skills    -> ../.agents/skills
#   AGENTS.md         the real instructions
#   CLAUDE.md         -> AGENTS.md
#
# Safe to re-run: an existing correct link is left alone, and a real directory
# is never deleted — the script says what it found and stops.
set -euo pipefail
cd "$(dirname "$0")/.."

link() {
  local target="$1" at="$2"
  if [ -L "$at" ]; then
    [ "$(readlink "$at")" = "$target" ] && { echo "ok   $at -> $target"; return; }
    rm "$at"
  elif [ -e "$at" ]; then
    echo "skip $at exists and is not a symlink — move it yourself" >&2
    return
  fi
  mkdir -p "$(dirname "$at")"
  ln -s "$target" "$at"
  echo "link $at -> $target"
}

link ../.agents/skills .claude/skills
link AGENTS.md CLAUDE.md
