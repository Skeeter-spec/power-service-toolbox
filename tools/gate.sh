#!/bin/sh
# The gate. Everything this repo claims about itself, checked in one command.
#
#   ./tools/gate.sh
#
# The repo's rule is "nothing ships until it reproduces a published worked example." A rule that
# lives only in a README is a wish. This is the rule as a command, and it exits nonzero when broken.
#
# Four things get checked, and each one exists because it ALREADY FAILED once:
#   1. verify   - every project's suite passes.
#   2. mutants  - the suites can actually FAIL. Green means nothing until you have watched it go red.
#                 (Caught a dead feature and a real bug in 01.)
#   3. sources  - every citation states how far it was verified. No unaudited URL in the prose.
#                 (This repo's whole claim is "I checked.")
#   4. readme   - the status block matches the PROGRESS.log files.
#                 (The README said "no tool is live yet" after 01 was live.)
set -u
cd "$(dirname "$0")/.." || exit 2
fail=0

echo "GATE"
echo ""

echo "[1/4] verify suites"
found=0
for p in projects/*/; do
  [ -f "$p/verify/verify.js" ] || continue
  found=$((found + 1))
  if ( cd "$p" && node verify/verify.js >/dev/null 2>&1 ); then
    n=$( ( cd "$p" && node verify/verify.js 2>/dev/null ) | grep -oE '^[0-9]+ passed' | head -1)
    echo "  OK   $p ($n)"
  else
    echo "  FAIL $p — verify does not pass. It does not ship."
    fail=1
  fi
done
[ "$found" -eq 0 ] && echo "  (no verify suites yet)"

echo ""
echo "[2/4] mutation testing (can the suites fail?)"
found=0
for p in projects/*/; do
  [ -f "$p/verify/mutants.txt" ] || continue
  found=$((found + 1))
  if ./tools/mutate.sh "${p%/}" >/dev/null 2>&1; then
    echo "  OK   $p (every mutant died)"
  else
    echo "  FAIL $p — a mutant SURVIVED, or the runner errored. Run: ./tools/mutate.sh ${p%/}"
    fail=1
  fi
done
[ "$found" -eq 0 ] && echo "  (no mutant lists yet)"

echo ""
echo "[3/4] source audit"
python3 tools/check_sources.py || fail=1

echo ""
echo "[4/4] README status block and tools table"
python3 tools/build_readme.py --check || fail=1

# The private tracker, if this working copy has one. mission-control/ is GITIGNORED, so a cloner
# does not have it and must still pass the gate: absent is not a failure, it is normal.
#
# It is checked at all because dashboard.html is a BUILD ARTIFACT, and an artifact nobody rebuilds
# is one more copy of the truth. MEASURED 2026-07-17: flipping a PROGRESS.log phase and not
# rebuilding left the dashboard claiming the old tally, and this gate printed GATE PASSED without
# mentioning it. That is the same silence that let the CSV's phase columns drift 8 cells and tell
# Keaton "2 live" while four were live.
if [ -f mission-control/build_dashboard.py ]; then
  python3 mission-control/build_dashboard.py --check || fail=1
fi

echo ""
if [ "$fail" -ne 0 ]; then
  echo "GATE FAILED. Do not ship."
  exit 1
fi
echo "GATE PASSED."
