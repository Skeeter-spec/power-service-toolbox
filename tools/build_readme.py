#!/usr/bin/env python3
"""Generate the root README's status block from each project's PROGRESS.log.

    ./tools/build_readme.py           regenerate the block in place
    ./tools/build_readme.py --check   exit 1 if the README is out of sync (gate mode)

WHY THIS EXISTS

On 2026-07-15 the README said "No tool has passed verify yet, so no tool is live yet" for as long as
it took someone to notice. It was true when written and false the moment 01 shipped. Nothing caught
it, because a status hand-typed into prose has no source of truth behind it: it is a COPY, and a copy
rots. The repo already knows this rule (PROGRESS.log decides, the dashboard displays) and the README
was the one place that broke it.

A rule reminding you to update the README would be rung 4: better than nothing, still a thing to
remember. Generating the block instead deletes the failure. You cannot forget to update a copy that
is not a copy.

DELIBERATELY PUBLIC-FILES-ONLY. mission-control/ is gitignored, so this reads the ten PROGRESS.log
files (which ship) rather than projects.csv (which does not). Anyone who clones the repo can
regenerate the README and get the same bytes. If this read the tracker, only Keaton could.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = "https://skeeter-spec.github.io/power-service-toolbox"
BEGIN = "<!-- BEGIN GENERATED: status. Do not hand edit. Regenerate: ./tools/build_readme.py -->"
END = "<!-- END GENERATED: status -->"
PHASES = ("source", "learn", "build", "verify", "publish", "live")


def read_progress(d):
    """Parse one project's PROGRESS.log. It is the source of truth; nothing else is."""
    log = d / "PROGRESS.log"
    if not log.exists():
        return None
    t = log.read_text()
    title = re.sub(r"\s*—.*$", "", t.splitlines()[0].lstrip("# ").strip())
    phases = {}
    for p in PHASES:
        m = re.search(rf"^\s+{p}\s+(todo|wip|done)\s*$", t, re.M)
        if not m:
            raise SystemExit(f"FAIL {log}: no readable '{p}' phase line. The generator cannot guess.")
        phases[p] = m.group(1)
    return {"slug": d.name, "title": title, "phases": phases}


def render(projects):
    live = [p for p in projects if p["phases"]["live"] == "done"]
    verified = [p for p in projects if p["phases"]["verify"] == "done"]
    n = len(live)
    word = {0: "No", 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five",
            6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "All ten"}.get(n, str(n))

    out = [BEGIN, ""]
    if n == 0:
        out.append(f"**{word} of the ten tools is live yet.** "
                   f"{len(verified)} have passed `verify`.")
    else:
        verb = "is" if n == 1 else "are"
        out.append(f"**{word} of the ten tools {verb} live**, meaning {'it has' if n == 1 else 'they have'} "
                   f"passed the gate above and {'is' if n == 1 else 'are'} running where you can click "
                   f"{'it' if n == 1 else 'them'}:")
        out.append("")
        for p in live:
            num = p["slug"].split("-")[0]
            # No dash separator here: this output lands in public facing copy, and the standing
            # rule is no dash characters in it. The dash-check hook caught exactly this line.
            out.append(f"- **{num}. {p['title'].split(' ', 1)[1] if ' ' in p['title'] else p['title']}**: "
                       f"[live demo]({PAGES}/projects/{p['slug']}/build/index.html)")
    out += ["", END]
    return "\n".join(out)


def main():
    check = "--check" in sys.argv
    dirs = sorted(d for d in (ROOT / "projects").iterdir() if d.is_dir())
    projects = [p for p in (read_progress(d) for d in dirs) if p]
    if not projects:
        raise SystemExit("FAIL: no projects found")

    readme = ROOT / "README.md"
    t = readme.read_text()
    if BEGIN not in t or END not in t:
        raise SystemExit(f"FAIL: README.md has no generated-status markers.\nAdd:\n{BEGIN}\n{END}")

    block = render(projects)
    new = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _: block, t, flags=re.S)

    if check:
        if new != t:
            print("FAIL: README status block is STALE. The PROGRESS.log files disagree with it.")
            print("      This is the exact failure that shipped on 2026-07-15.")
            print("      Fix: ./tools/build_readme.py")
            return 1
        live = sum(1 for p in projects if p["phases"]["live"] == "done")
        print(f"  README status: in sync ({live} live of {len(projects)})")
        return 0

    readme.write_text(new)
    live = sum(1 for p in projects if p["phases"]["live"] == "done")
    print(f"Wrote README.md status block: {live} live of {len(projects)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
