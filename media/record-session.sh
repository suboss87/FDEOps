#!/bin/bash
# Regenerates media/session.gif from a REAL fdeops session.
#
# Every line of output in the recording is the CLI's own - only the typing pace
# and the pauses between commands are staged. If you change CLI output, re-record
# rather than editing the gif.
#
#   deps:  pip install asciinema   +   agg (github.com/asciinema/agg)
#   usage: media/record-session.sh            # record + convert
#          media/record-session.sh --play     # run the session in this terminal
#
# It runs in a throwaway workspace under $TMPDIR and a throwaway engagements root,
# so it never touches your real ~/fde-engagements.
set -eu

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FDE="node $REPO/bin/fde.js"
GREY=$'\033[2;37m'
CYAN=$'\033[1;36m'
OFF=$'\033[0m'

type_out() {
  local s="$1" i
  for ((i = 0; i < ${#s}; i++)); do
    printf '%s' "${s:i:1}"
    sleep 0.02
  done
  printf '\n'
}

run() {
  local shown="fde" a
  for a in "$@"; do
    case $a in *[[:space:]]*) shown="$shown \"$a\"" ;; *) shown="$shown $a" ;; esac
  done
  printf '%s' "${GREY}acme-payments ${CYAN}\$${OFF} "
  type_out "$shown"
  sleep 0.3
  $FDE "$@" 2>&1
  printf '\n'
  sleep "${PAUSE:-2.2}"
}

note() {
  printf '%s\n\n' "${GREY}$1${OFF}"
  sleep 1.4
}

session() {
  clear 2>/dev/null || printf '\033[H\033[2J\033[3J'
  sleep 0.8

  note "# day 1 - bind this client, then hand it the messy kickoff notes"
  PAUSE=1.4 run resume --init acme-payments
  PAUSE=3.4 run debrief kickoff-notes.md --smart
  note "# nothing is written until you confirm the routing"
  PAUSE=2.4 run debrief kickoff-notes.md --smart --apply
  PAUSE=1.2 run log phase discover
  PAUSE=1.8 run log contact "Priya has not replied to two emails about the runbook" --signal amber

  note "# next morning. cold session, nothing pasted, no tokens spent"
  PAUSE=3.4 run resume
  PAUSE=3.4 run prep "sponsor sync with Priya"
  note "# six weeks later: \"when did we agree to that?\""
  PAUSE=3.2 run receipts reconciliation
  PAUSE=2.6 run doctor
  PAUSE=3.5 run dashboard
}

if [ "${1:-}" = "--session" ]; then
  session
  exit 0
fi

WORK="$(mktemp -d)/acme-payments"
mkdir -p "$WORK"
cat > "$WORK/kickoff-notes.md" <<'NOTES'
Kickoff call with Acme payments team - Priya (VP Eng, sponsor), Tom (staff eng)

decision: settle on the existing Stripe connector instead of the in-house rewrite - Priya wants the Q3 audit clean first
risk: nobody can name who owns the reconciliation job; it has failed silently twice since March
delivery: read-only access to the payments repo and the last 90 days of audit logs
contact: Priya is bought in but travelling for two weeks - Tom is the day-to-day decision maker
next: get the reconciliation runbook from Tom before touching anything

<private>
Priya hinted the previous vendor was let go mid-contract. Do not repeat this to the team.
</private>
NOTES

cd "$WORK"
git init -q .
git add -A
git -c user.email=you@example.dev -c user.name="You" commit -qm "kickoff notes"

export FDEOPS_ENGAGEMENTS_ROOT="$(dirname "$WORK")/fde-engagements"

if [ "${1:-}" = "--play" ]; then
  session
  exit 0
fi

TERM=xterm-256color asciinema rec \
  -c "bash '${BASH_SOURCE[0]}' --session" \
  --cols 100 --rows 34 --overwrite "$REPO/media/session.cast"

agg --font-size 15 --theme asciinema --idle-time-limit 2 \
  "$REPO/media/session.cast" "$REPO/media/session.gif"

command -v gifsicle >/dev/null && gifsicle -O3 --lossy=60 --colors 128 \
  "$REPO/media/session.gif" -o "$REPO/media/session.gif"

echo "wrote media/session.cast + media/session.gif"
