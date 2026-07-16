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
# ANY SURVIVING MUTANT IS A FINDING. It is USUALLY one of those two things, and 02 turned up the
# third, so the list is no longer "exactly one of two":
#
#   3. AN EQUIVALENT MUTANT. The edit produces code that cannot be told apart from the original by
#      ANY input, so no assertion can kill it and there is nothing to fix. 02's case: `m <= 1` vs
#      `m < 1` guarding a division, where at m = 1 the division already returns Infinity on its own.
#      The action is to DELETE THE MUTANT and write down why, not to cut the code and not to chase a
#      test that cannot exist. Prove equivalence before claiming it: if you cannot show that no input
#      distinguishes the two, you have a coverage hole and you are talking yourself out of it.
#
# The distinction matters because 1 and 2 say "change the code" and 3 says "change the mutant", and
# guessing wrong means deleting correct code to make a tool go quiet.
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

# Trim leading/trailing whitespace. This used to be `xargs`, which was a real bug and a sneaky one:
# xargs parses SHELL QUOTING, so any description containing an apostrophe ("the family's p") died with
# "xargs: unterminated quote" and the description came back EMPTY. The mutant still ran, so the run
# looked fine, but a SURVIVOR could be reported with a blank name -- the one line a person actually
# needs to read to act on the finding. A tool that reports findings must not mangle their names.
trim() { echo "$1" | sed 's/^ *//; s/ *$//'; }

while IFS='|' read -r target expr desc; do
  case "$target" in ''|\#*) continue ;; esac
  target=$(trim "$target")
  expr=$(trim "$expr")
  desc=$(trim "$desc")
  f="$P/$target"
  [ -f "$f" ] || { echo "  SKIP       $desc (no such file: $target)"; continue; }

  # A MUTANT THAT NEVER RAN MUST NEVER BE REPORTED AS "killed". This is the runner's own version of
  # the false pass it exists to catch, and it was live in here until 2026-07-16.
  #
  # MEASURED, not theorised. `IFS='|' read` splits on pipes, so a sed expression containing one --
  # `s/a && b/a || b/`, the natural way to write "any one of these suffices" -- is TRUNCATED at the
  # first pipe. The truncated expression is invalid sed. sed then exits 1 and writes NOTHING, so the
  # runner copied a ZERO BYTE FILE over the target, node could not run at all, and the failure was
  # reported as:  killed. Exit 0. "Every mutant died. The suite measures something."
  #
  # An empty file kills every suite. So ANY malformed sed reported a kill it had not earned, and the
  # tool built to stop vacuous test suites was itself printing a vacuous pass. The NO-OP check below
  # cannot see this: it catches "changed nothing", and this is "destroyed everything".
  case "$desc" in
    *"|"*)
      echo "  BAD MUTANT $desc"
      echo "             ^ THE SED EXPRESSION CONTAINS A PIPE, so this line was split wrong and the"
      echo "               expression you see above is a fragment. mutants.txt is parsed with"
      echo "               \`IFS='|' read\`; a pipe in the expression truncates it silently."
      echo "               Rewrite without a pipe: express \"any one suffices\" by DROPPING each"
      echo "               criterion in turn, which proves each is individually load bearing anyway."
      survived=$((survived + 1))
      continue
      ;;
  esac

  cp "$f" "$TMP/orig"
  if ! sed "$expr" "$TMP/orig" > "$TMP/mutant" 2>"$TMP/sederr"; then
    echo "  BAD MUTANT $desc"
    echo "             ^ sed REJECTED the expression, so no mutant was ever applied and the suite"
    echo "               never had a chance to notice one. This is NOT a kill."
    echo "               sed said: $(head -1 "$TMP/sederr")"
    survived=$((survived + 1))
    cp "$TMP/orig" "$f"
    continue
  fi
  if [ ! -s "$TMP/mutant" ]; then
    # Belt and braces: an empty file PARSES (`node --check` on 0 bytes succeeds), so emptiness needs
    # its own test. A 0 byte source kills every suite for reasons unrelated to the behaviour.
    echo "  BAD MUTANT $desc"
    echo "             ^ the mutant is EMPTY. An empty file fails every suite no matter what it"
    echo "               asserts, so a 'kill' here would measure nothing. This is NOT a kill."
    survived=$((survived + 1))
    cp "$TMP/orig" "$f"
    continue
  fi

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
