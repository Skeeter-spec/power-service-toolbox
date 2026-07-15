#!/usr/bin/env python3
"""Generate a source hunt worker prompt. The rubric lives HERE, once, not in eight hand typed prompts.

    ./tools/source_hunt_prompt.py 05-modbus-meter "a published Modbus register map with published
                                                   register values for a real meter"

WHY THIS EXISTS

02, 03 and 04 were sourced by three parallel workers whose prompts I wrote out by hand, three times,
with a ~40 line rubric that was identical in all three. That is exactly the failure already recorded as
pitfall 5 in the `parallel-worker-agent-pitfalls` memory: *"bake repeated-task quality rubrics into the
shared kit/runbook, not one-off prompts."* I did it anyway, because retyping felt cheaper than building
this. Eight projects still need a source hunt.

The cost is not the typing. It is that **a rule learned on hunt N does not reach hunts N+1..N+8.** The
hard won rule from 02/04 (a third party scan is fine for LOCATING a document and is NOT evidence about
its CONTENTS) was learned AFTER those three prompts were written, so not one of them contained it. With
eight hunts left, a rule that lives in prose gets typed correctly maybe five times.

THE LEVELS ARE IMPORTED FROM check_sources.py ON PURPOSE. The worker is told the exact vocabulary the
gate enforces, so the prompt and the gate cannot drift apart. Change the levels in one place and both
follow. If you find yourself pasting the level list into a prompt by hand, you have reintroduced the bug.
"""
import sys, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from check_sources import LEVELS, PROVENANCE  # single source of truth. Do NOT retype these.

ROOT = pathlib.Path(__file__).resolve().parent.parent

RUBRIC = """\
You are a RESEARCH WORKER, not a coordinator. Do not report back until you have WRITTEN YOUR OUTPUT
FILE. Do not ask questions, do not propose a plan, do not stop early, and do NOT spawn or dispatch
sub agents: do the research yourself. Your final message is a return value read by a program, not a
human. Keep it short. THE FILE IS THE DELIVERABLE.

# Output file (write this, or your work is lost)
`{outfile}`

# Context
This is a public repo of data center power service tools. Its ONE rule: an app is not published until
it reproduces a PUBLISHED WORKED EXAMPLE and the result matches the published answer. Project 01
succeeded solely because we found one free, no login document that published BOTH a diagram AND its
own stated verdict on that diagram. That pairing is what makes verification possible at all. Without
it there is no verify phase and the project gets re scoped, not started.

02 raised the bar: its source publishes a NUMBER rather than a prose verdict (an equation, its
constants, a 210 cell trip time table, and a worked example stating its own answer). Look for that
shape. A source that agrees with itself three ways is a source you can build a gate on.

# Your target: project {project}
{target}

# Hard rules
- **FREE and no login only** for anything we would verify against. Note gated or paid docs separately;
  we cite them by number and never use their content.
- **Cite, never redistribute.** "Free to download" is NOT "free to redistribute." Do not commit any
  PDF. Return CITATIONS and URLs that can be fetched from the publisher.
- **Prefer primary literature** (manufacturer manuals, application guides, standards bodies, government
  technical manuals) over trade press, blogs, distributor pages, or forum posts.
- **Actually FETCH the pages.** A search result snippet is not a read document.
- **A THIRD PARTY SCAN OR MIRROR IS FOR LOCATING A DOCUMENT, NOT FOR TRANSCRIBING ONE.** This is the
  most expensive rule here and it was paid for in full. On 2026-07-15 two independent workers scraped
  the SAME table from the SAME scan site and returned TWO DIFFERENT WRONG equations, neither matching
  the publisher's own PDF, both physically absurd. Both had honestly graded the scan "FETCHED, NOT
  READ" and stated the wrong equation as fact anyway. **If a number, equation, or constant matters,
  get the publisher's own PDF and say so. If you could only reach a mirror, SAY THAT LOUDLY.**

# EVIDENCE GRADING IS MANDATORY, per claim and per source
State how far YOU personally took each one, using exactly these levels (this vocabulary is enforced by
the repo's gate, so use it verbatim):
{levels}

Be brutally honest. An overstated level is worse than a gap: this repo's entire claim is "I actually
checked." Do NOT dress up a snippet as a read. Do NOT fabricate a URL, a page number, a constant, or a
quote. **If you are unsure of a number, mark it UNVERIFIED.** A plausible but invented number is the
single worst thing you can hand back: it is undetectable downstream and it would silently poison the
verify phase, which is the one thing this repo exists to get right.

**Your grade is a warning, not a fix.** Grading a source weak does not license stating its contents as
fact in your prose. If it is weak and it matters, go get a stronger copy or flag it as unresolved.

# Required file structure
1. `## Verdict` — can this project have a real verify phase, YES or NO? Name the single best candidate
   source. Lead with this. **"NO" is a completely acceptable answer and is far more useful than a
   stretched YES** — it re scopes the project before a build is sunk into it.
2. `## The worked example` — the example and its STATED answer, quoted verbatim with all inputs. Or
   NOT FOUND, stated loudly.
3. `## Source audit` — a markdown table: | Source | Level | URL | Read at | with one row per source,
   one level per row (never "READ IN FULL / TRACED" — pick one).
   **`Read at` is a SEPARATE AXIS from the level and it is not optional:**
{provenance}
   The level says how far you read. `Read at` says WHOSE COPY you read. They are independent: reading
   a distributor's re render cover to cover is TRACED at a MIRROR, and that is a perfectly good row.
   **Saying MIRROR is never the failure. Failing to say is.** If the publisher's copy is gated, write
   MIRROR and say so in `## Gaps` — do not upgrade it because the file looks authentic.
4. `## Candidate primary source(s)` — what each publishes, page and figure numbers, verbatim quotes of
   any stated answer.
5. `## Gaps` — REQUIRED. What you could not verify, what is gated, what you searched for and did not
   find, what you are unsure about, and any source you found to contradict ITSELF. A gaps section that
   says "none" is a failing gaps section.

Write the file. Then reply with a 3 sentence summary and the verdict. Note that your summary will NOT
be trusted over your file, so do not smooth anything over in it.
"""


def build(project, target, outfile=None):
    outfile = outfile or f"<scratchpad>/{project}-findings.md"
    levels = "\n".join(f"- **{k}** — {v}" for k, v in LEVELS.items())
    prov = "\n".join(f"   - **{k}** — {v}" for k, v in PROVENANCE.items())
    return RUBRIC.format(project=project, target=target.strip(), levels=levels,
                         provenance=prov, outfile=outfile)


def main():
    if len(sys.argv) < 3:
        names = sorted(p.name for p in (ROOT / "projects").iterdir() if p.is_dir())
        print(__doc__)
        print("projects:", ", ".join(names))
        return 2
    print(build(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None))
    return 0


if __name__ == "__main__":
    sys.exit(main())
