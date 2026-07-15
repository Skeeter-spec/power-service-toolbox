#!/bin/sh
# Mutation runner. Break the code on purpose and confirm the verify suite notices.
#
#   ./tools/mutate.sh projects/01-power-chain
#
# WHY THIS EXISTS
#
# A verify suite that passes is not evidence. A verify suite that passes AND goes red when you break
# the thing it tests is evidence. Until you have watched it fail, "31 passed" and "31 assertions that
# cannot fail" look exactly the same from the outside, and one of them is a lie you will ship.
#
# On project 01 this found two things in a single pass, and neither was visible any other way:
#   1. DEAD CODE. A whole unplanned-fault analysis whose logic could be broken with no test noticing,
#      because nothing needed it. It was cut.
#   2. A REAL BUG. A bus tie encoded one way, so one side could never back feed the other. Nothing
#      failed, because no assertion covered what the tie was for.
#
# ANY SURVIVING MUTANT IS A FINDING. It is exactly one of those two things. Both are worth knowing.
#
# HOW TO USE IT
#
# Each project declares its own mutants in verify/mutants.txt, one per line:
#
#     <target file> | <sed expression> | <description>
#
# Write one mutant per real behaviour the code claims to have. If you cannot think of a way to break
# a behaviour, you probably have not tested it.

set -u
P="${1:-}"
[ -z "$P" ] && { echo "usage: ./tools/mutate.sh <project-dir>   e.g. projects/01-power-chain"; exit 2; }
[ -d "$P" ] || { echo "no such project: $P"; exit 2; }

M="$P/verify/mutants.txt"
V="$P/verify/verify.js"
[ -f "$M" ] || { echo "no mutant list: $M"; exit 2; }
[ -f "$V" ] || { echo "no verify suite: $V"; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "MUTATION TESTING $P"
echo "A green suite proves nothing until you have watched it go red."
echo ""

# Baseline must be GREEN, or every mutant "fails" for the wrong reason and the run is meaningless.
if ( cd "$P" && node verify/verify.js >/dev/null 2>&1 ); then
  echo "  BASELINE   green. Good, proceed."
else
  echo "  BASELINE   RED. Fix the suite before mutating; every result below would be noise."
  exit 1
fi
echo ""

survived=0
killed=0

while IFS='|' read -r target expr desc; do
  case "$target" in ''|\#*) continue ;; esac
  target=$(echo "$target" | xargs)
  expr=$(echo "$expr" | sed 's/^ *//; s/ *$//')
  desc=$(echo "$desc" | xargs)
  f="$P/$target"
  [ -f "$f" ] || { echo "  SKIP       $desc (no such file: $target)"; continue; }

  cp "$f" "$TMP/orig"
  sed "$expr" "$TMP/orig" > "$TMP/mutant"

  if cmp -s "$TMP/orig" "$TMP/mutant"; then
    # The sed matched nothing, so this mutant never existed. That is a silent false PASS:
    # the suite "survived" a mutation that was never applied. Catch it loudly.
    echo "  NO-OP      $desc"
    echo "             ^ the sed changed NOTHING. The expression is stale, probably because the code"
    echo "               moved. Fix the mutant, or you are testing an illusion."
    survived=$((survived + 1))
    cp "$TMP/orig" "$f"
    continue
  fi

  cp "$TMP/mutant" "$f"
  if ( cd "$P" && node verify/verify.js >/dev/null 2>&1 ); then
    echo "  SURVIVED   $desc"
    survived=$((survived + 1))
  else
    echo "  killed     $desc"
    killed=$((killed + 1))
  fi
  cp "$TMP/orig" "$f"
done < "$M"

echo ""
echo "  $killed killed, $survived survived."

# Restoring is not optional and it is not assumed: prove the tree is back where it started.
if ( cd "$P" && node verify/verify.js >/dev/null 2>&1 ); then
  echo "  RESTORED   baseline green again. Tree is clean."
else
  echo "  ⚠ BASELINE IS RED AFTER RESTORE. A mutant did not get reverted. Check git diff NOW."
  exit 1
fi

if [ "$survived" -gt 0 ]; then
  echo ""
  echo "  A SURVIVING MUTANT IS A FINDING, not a nuisance. It is one of exactly two things:"
  echo "    1. DEAD CODE     - nothing tests it because nothing needs it. Cut it."
  echo "    2. COVERAGE HOLE - and often a real bug living in it. Write the assertion."
  exit 1
fi
echo "  Every mutant died. The suite measures something."
