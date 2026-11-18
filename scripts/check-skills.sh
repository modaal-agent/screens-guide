#!/usr/bin/env bash
# Agent-skill and spec checks: every skill under `skills/`, the two plugin
# manifests that publish them, and every spec under `specs/`.
#
# Adapted from scripts/check-skills.sh in https://github.com/modaal-agent/skills
# at 4cf5fcc. The check ids are that script's. S12 and S13 are left out: they
# check the scripts a skill ships, and a skill here ships none
# (specs/002-agent-interfaces/spec.md, D5). S8 reads this repository's layout:
# the marketplace at .claude-plugin/marketplace.json, and the plugin rooted at
# skills/, with its manifest at skills/.claude-plugin/plugin.json. S17 to S20
# are this repository's (spec 002 §5): the eval cases, the plugin root's file
# types, the plugin's version, and the MCP Registry's server.json.
#
# What they hold a skill to: frontmatter every install channel can parse, a body
# inside the documented budgets, links that resolve, a README index that lists
# every skill directory, skill names that resolve, and AGENTS.md and CLAUDE.md
# named together. For every spec, they check that section references resolve and
# private references are redacted. They check structure, not intent: a skill
# that tells an agent to do the wrong thing passes all of them, and the
# pull-request review is where that is caught (SECURITY.md).
#
# No network and no build: bash, find, grep, awk, perl and python3.
#
# Usage:
#   scripts/check-skills.sh               # check this checkout
#   scripts/check-skills.sh <root>        # check a tree elsewhere
#   scripts/check-skills.sh --self-test   # each check red against a seeded violation
#
# S19 compares the tree with a base commit: $SKILLS_BASE_REF when it is set (ci.yml
# sets the pull request's base or the push's previous commit), else HEAD, so a
# local run checks the uncommitted changes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ "${1:-}" = "--self-test" ]; then
  SELF_TEST=1
  ROOT="$REPO_DIR"
else
  SELF_TEST=0
  ROOT="${1:-$REPO_DIR}"
fi

SKILLS_DIR="$ROOT/skills"
MANIFEST_DIR="$ROOT/.claude-plugin"
README="$ROOT/README.md"

# The Agent Skills standard's six keys. Claude Code accepts fourteen more; the
# Skills API and claude.ai reject every one of them by name, so a skill that has
# to stay uploadable carries none.
STANDARD_KEYS="name description license compatibility metadata allowed-tools"

# The body is resident for every turn after the skill is invoked; a reference
# costs nothing until the agent opens it. The description is resident in every
# session, invoked or not.
SKILL_BODY_MAX=400
REFERENCE_MAX=250
DESCRIPTION_MAX=1024

# ── python helpers ───────────────────────────────────────────────
# Each is a function so its heredoc is parsed at statement level; a heredoc
# written inside $( … ) is scanned for the closing paren and misreads quotes.

py_s1() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
for skill in sorted(pathlib.Path(sys.argv[1]).glob('*/SKILL.md')):
    lines = skill.read_text().split('\n')
    if not lines or lines[0] != '---':
        print(f"{skill.parent.name}: line 1 is not ---"); continue
    try:
        end = lines.index('---', 1)
    except ValueError:
        print(f"{skill.parent.name}: no closing ---"); continue
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            continue
        m = re.match(r'^(\s*)([A-Za-z0-9_-]+):(\s*)(.*)$', line)
        if not m:
            print(f"{skill.parent.name}:{n}: not a key: value line"); continue
        value = m.group(4)
        if value and value[0] not in '"\'' and ': ' in value:
            print(f"{skill.parent.name}:{n}: unquoted value carrying ': '")
PY
}

py_parsed() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
for skill in sorted(pathlib.Path(sys.argv[1]).glob('*/SKILL.md')):
    lines = skill.read_text().split('\n')
    if not lines or lines[0] != '---' or '---' not in lines[1:]:
        continue
    parent = ''
    for line in lines[1:lines.index('---', 1)]:
        m = re.match(r'^(\s*)([A-Za-z0-9_-]+):(\s*)(.*)$', line)
        if not m:
            continue
        indent, key, value = len(m.group(1)), m.group(2), m.group(4)
        if indent == 0:
            parent = key
            print(f"{skill.parent.name}\t{key}\t{value}")
        else:
            print(f"{skill.parent.name}\t{parent}.{key}\t{value}")
PY
}

py_s6() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
for f in sorted(root.rglob('*.md')):
    for m in re.finditer(r'\]\((?!https?://|#|mailto:)([^)#]+)', f.read_text()):
        if not (f.parent / m.group(1)).exists():
            print(f"{f.relative_to(root)} → {m.group(1)}")
PY
}

py_s8() {
  python3 - "$1" <<'PY'
import json, pathlib, re, sys
root = pathlib.Path(sys.argv[1])
try:
    marketplace = json.loads((root / '.claude-plugin' / 'marketplace.json').read_text())
except Exception as error:
    print(f".claude-plugin/marketplace.json does not parse: {error}"); raise SystemExit
entries = marketplace.get('plugins', [])
if len(entries) != 1:
    print(f"the marketplace lists {len(entries)} plugins, and this repository publishes one"); raise SystemExit
entry = entries[0]
source = entry.get('source')
if not isinstance(source, str) or not source.startswith('./'):
    print(f"the marketplace entry's source is not a ./ path: {source!r}"); raise SystemExit
plugin_root = (root / source).resolve()
try:
    plugin = json.loads((plugin_root / '.claude-plugin' / 'plugin.json').read_text())
except Exception as error:
    print(f"{source}/.claude-plugin/plugin.json does not parse: {error}"); raise SystemExit
if plugin.get('name') != entry.get('name'):
    print(f"plugin.json is named {plugin.get('name')!r}, and the marketplace entry {entry.get('name')!r}")
if not re.fullmatch(r'\d+\.\d+\.\d+', str(plugin.get('version', ''))):
    print(f"plugin.json's version is {plugin.get('version')!r}, not MAJOR.MINOR.PATCH")
paths = plugin.get('skills') or []
loaded = set()
for p in ([paths] if isinstance(paths, str) else paths):
    d = (plugin_root / p).resolve()
    if (d / 'SKILL.md').is_file():
        loaded.add(d)
    else:
        loaded.update(s.parent for s in d.glob('*/SKILL.md'))
for skill in sorted((root / 'skills').glob('*/SKILL.md')):
    if skill.parent.resolve() not in loaded:
        print(f"plugin.json's skills path does not load {skill.parent.relative_to(root)}/")
PY
}

py_s10() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
skills = pathlib.Path(sys.argv[1])
names = {p.name for p in skills.iterdir() if p.is_dir()}
# A skill reference is a backticked name, or a list of them, followed by the
# word "skill" or "skills": "the `writing-style` skill", "the `a` or `b` skill".
token = r'`[a-z0-9]+(?:-[a-z0-9]+)*`'
group = re.compile(r'((?:' + token + r'(?:,\s+|\s+(?:and|or)\s+)?)+)\s+skills?\b')
for f in sorted(skills.rglob('*.md')):
    text = f.read_text()
    for m in group.finditer(text):
        for name in re.findall(r'`([a-z0-9-]+)`', m.group(1)):
            if name not in names:
                line = text.count('\n', 0, m.start()) + 1
                print(f"{f.relative_to(skills.parent)}:{line}: `{name}` names no directory under skills/")
PY
}

py_s11() {
  python3 - "$1" <<'PY'
import pathlib, sys
skills = pathlib.Path(sys.argv[1])
for f in sorted(p for p in skills.rglob('*') if p.is_file()):
    try:
        text = f.read_text()
    except UnicodeDecodeError:
        continue
    agents, claude = 'AGENTS.md' in text, 'CLAUDE.md' in text
    if agents != claude:
        named, missing = ('AGENTS.md', 'CLAUDE.md') if agents else ('CLAUDE.md', 'AGENTS.md')
        print(f"{f.relative_to(skills.parent)} names {named} and not {missing}")
PY
}

# py_specs <root>: one line per S15 or S16 failure, as <check>\t<message>.
py_specs() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])

def collapse(s):
    return re.sub(r'\s+', ' ', s).strip()

def outline(path):
    """Heading titles, with and without their numbers, and the section and definition numbers."""
    titles, numbers = [], set()
    for line in path.read_text().split('\n'):
        m = re.match(r'^#{1,6}\s+(.*?)\s*$', line)
        if m:
            titles.append(collapse(m.group(1)))
            n = re.match(r'^(\d+(?:\.\d+)*)\.?\s+(.*)$', m.group(1))
            if n:
                numbers.add(n.group(1))
                titles.append(collapse(n.group(2)))
        for d in re.finditer(r'\*\*(\d+(?:\.\d+)+) —', line):
            numbers.add(d.group(1))
    return titles, numbers

specs = sorted(list(root.glob('specs/*/spec.md')) + list(root.glob('specs/*/followup-*.md')))
for spec in specs:
    rel = spec.relative_to(root)
    text = spec.read_text()
    titles, numbers = outline(spec)
    flat = collapse(text)

    # S15: §N, §N.M and both ends of §N–§M, unless written after an external id.
    for m in re.finditer(r'(E\d+ )?§(\d+(?:\.\d+)*)(?:–§(\d+(?:\.\d+)*))?', flat):
        if m.group(1) or re.search(r'spec \d{3} $', flat[max(0, m.start() - 9):m.start()]):
            continue
        for n in filter(None, (m.group(2), m.group(3))):
            if n not in numbers:
                print(f"S15\t{rel}: §{n} is not a heading or a numbered definition in this file")
    # S15: §"Title" directly after a file name, a backticked file name or a link.
    for m in re.finditer(r'(?:\[[^\]]*\]\(([^)#\s]+)\)|`([\w./-]+\.\w+)`|([\w./-]+\.\w+)) §"([^"]+)"', flat):
        link, target = m.group(1), m.group(1) or m.group(2) or m.group(3)
        candidates = [spec.parent / target] if link else [root / target, spec.parent / target]
        found = next((p for p in candidates if p.is_file()), None)
        title = collapse(m.group(4))
        if found is None:
            print(f"S15\t{rel}: {target} §\"{title}\" names a file that does not exist")
        elif not any(t.startswith(title) for t in outline(found)[0]):
            print(f"S15\t{rel}: {target} has no heading beginning \"{title}\"")
    # S15: spec NNN §N.
    for m in re.finditer(r'spec (\d{3}) §(\d+(?:\.\d+)*)', flat):
        targets = list(root.glob(f'specs/{m.group(1)}-*/spec.md'))
        if not targets or m.group(2) not in outline(targets[0])[1]:
            print(f"S15\t{rel}: spec {m.group(1)} §{m.group(2)} does not resolve")

    # S16: the register, a row per cited id, and a redaction on every private row.
    section = re.search(r'^## [^\n]*External references[ \t]*$(.*?)(?=^## |\Z)', text, re.M | re.S)
    if not section:
        print(f"S16\t{rel}: no ## heading ending in External references")
        continue
    rows = {}
    for line in section.group(1).split('\n'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 3 and re.fullmatch(r'E\d+', cells[0]):
            rows[cells[0]] = cells
    body = text[:section.start()] + text[section.end():]
    for eid in sorted(set(re.findall(r'\bE\d+\b', body)), key=lambda s: int(s[1:])):
        if eid not in rows:
            print(f"S16\t{rel}: {eid} is cited and has no row in External references")
    for eid, cells in rows.items():
        if cells[2] not in ('yes', 'no'):
            print(f"S16\t{rel}: {eid}'s public cell is {cells[2]!r}, not yes or no")
        elif cells[2] == 'no' and not cells[1].startswith('*Redacted:*'):
            print(f"S16\t{rel}: {eid} is private, and its reference does not start with *Redacted:*")
PY
}

# py_s17 <root>: one line per eval case the runner would refuse. The keys are the
# ones `claude plugin eval` reads from prompt.md and from each grader's
# frontmatter, as Claude Code 2.1.322 defines them; the runner fails a case on
# any other key.
py_s17() {
  python3 - "$1" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
evals = root / 'evals'
PROMPT_KEYS = {'schema_version', 'name', 'description', 'tags', 'plugins', 'runs', 'expected_outcome',
               'model', 'max_turns', 'timeout_seconds', 'allowed_tools', 'disallowed_tools', 'artifact_publish',
               'growthbook_overrides', 'append_system_prompt', 'env'}
GRADER_KEYS = {
    'regex': {'target', 'pattern', 'flags', 'match', 'weight', 'arm'},
    'tool_order': {'before', 'after', 'weight', 'arm'},
    'tool_used': {'tool', 'input_match', 'min', 'max', 'weight', 'arm'},
    'file_exists': {'path', 'exists', 'weight', 'arm'},
    'llm': {'criteria', 'focus', 'weight', 'arm'},
    'baseline': {'baseline_file', 'criteria', 'weight', 'arm'},
}
BODY_KEY = {'regex': 'pattern', 'llm': 'criteria', 'baseline': 'criteria'}

def split(path):
    """The frontmatter's top-level keys and values, and the body; None when it does not close."""
    text = path.read_text()
    if not text.startswith('---\n'):
        return {}, text
    m = re.match(r'^---\n(.*?)^---[ \t]*(?:\n|\Z)', text, re.S | re.M)
    if not m:
        return None, ''
    keys = {k: v.strip() for k, v in re.findall(r'^([A-Za-z_][A-Za-z0-9_-]*):(.*)$', m.group(1), re.M)}
    return keys, text[m.end():]

if (root / 'skills' / 'evals').exists():
    print("skills/evals/ is inside the plugin root, where the runner refuses a case directory")
cases = sorted(p for p in evals.iterdir() if p.is_dir() and p.name not in ('results', 'mocks'))
if not cases:
    print("evals/ holds no case directory")
for case in cases:
    prompt = case / 'prompt.md'
    if not prompt.is_file():
        print(f"{case.name}: no prompt.md"); continue
    fm, body = split(prompt)
    if fm is None:
        print(f"{case.name}/prompt.md: the frontmatter does not close"); continue
    for key in sorted(set(fm) - PROMPT_KEYS):
        print(f"{case.name}/prompt.md: {key!r} is not a key the runner reads")
    if not body.strip():
        print(f"{case.name}/prompt.md: no body, so no prompt")
    graders = sorted((case / 'graders').glob('*.md')) if (case / 'graders').is_dir() else []
    if not graders:
        print(f"{case.name}: no graders/*.md")
    for grader in graders:
        where = f"{case.name}/graders/{grader.name}"
        fm, body = split(grader)
        if not fm:
            print(f"{where}: no frontmatter with type:"); continue
        kind = fm.get('type')
        if kind not in GRADER_KEYS:
            print(f"{where}: type {kind!r} is not one of {', '.join(sorted(GRADER_KEYS))}"); continue
        for key in sorted(set(fm) - GRADER_KEYS[kind] - {'type', 'name'}):
            print(f"{where}: {key!r} is not a key of a {kind} grader")
        if kind in BODY_KEY and BODY_KEY[kind] not in fm and not body.strip():
            print(f"{where}: a {kind} grader needs its {BODY_KEY[kind]} as the body")
        if kind == 'tool_used' and not fm.get('tool'):
            print(f"{where}: a tool_used grader needs tool:")
        if 'arm' in fm and fm['arm'] not in ('with-only', 'both'):
            print(f"{where}: arm {fm['arm']!r} is not with-only or both")
        if 'match' in fm and not re.fullmatch(r'contains|not_contains|count:\d+', fm['match']):
            print(f"{where}: match {fm['match']!r} is not contains, not_contains or count:N")
PY
}

# py_s18 <plugin root>: each file that is not Markdown, JSON or PNG, or that
# starts with #!.
py_s18() {
  python3 - "$1" <<'PY'
import pathlib, sys
root = pathlib.Path(sys.argv[1])
for f in sorted(p for p in root.rglob('*') if p.is_file() or p.is_symlink()):
    rel = f.relative_to(root.parent)
    if f.is_symlink():
        print(f"{rel}: a symbolic link"); continue
    if f.suffix.lower() not in ('.md', '.json', '.png'):
        print(f"{rel}: not Markdown, JSON or PNG")
    elif f.read_bytes()[:2] == b'#!':
        print(f"{rel}: starts with #!")
PY
}

# py_s19 <base version> <version>: prints a line when the version is not above the base's.
py_s19() {
  python3 - "$1" "$2" <<'PY'
import re, sys
base, new = sys.argv[1], sys.argv[2]
parse = lambda v: tuple(int(x) for x in re.fullmatch(r'(\d+)\.(\d+)\.(\d+)', v).groups()) if re.fullmatch(r'\d+\.\d+\.\d+', v) else None
if parse(new) is None or parse(base) is None:
    print(f"a version is not MAJOR.MINOR.PATCH: {base!r} → {new!r}")
elif parse(new) <= parse(base):
    print(f"skills/ changed and plugin.json's version stayed at {new} (base {base})")
PY
}

# py_s20 <root>: one line per way server.json departs from spec 002 §4.4.
py_s20() {
  python3 - "$1" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1]) / 'server.json'
try:
    doc = json.loads(path.read_text())
except Exception as error:
    print(f"server.json does not parse: {error}"); raise SystemExit
if doc.get('name') != 'io.github.modaal-agent/screens-guide':
    print(f"name is {doc.get('name')!r}, not 'io.github.modaal-agent/screens-guide'")
description = doc.get('description')
if not isinstance(description, str) or not 1 <= len(description) <= 100:
    print(f"description is {len(description) if isinstance(description, str) else description!r} characters, not 1 to 100")
if not isinstance(doc.get('version'), str) or not doc['version']:
    print("version is missing")
remotes = doc.get('remotes') or []
if remotes != [{'type': 'streamable-http', 'url': 'https://screens.guide/mcp'}]:
    print(f"remotes is {remotes!r}, not the one streamable-http remote https://screens.guide/mcp")
PY
}

plugin_version() {
  python3 -c 'import json, sys; print(json.load(sys.stdin).get("version", ""))'
}

FAILED=0
fail() {
  printf '✘ %s — %s\n' "$1" "$2" >&2
  FAILED=1
}
ok() { printf '✔ %s — %s\n' "$1" "$2"; }

# ── the checks ───────────────────────────────────────────────────

run_checks() {
  local skill_count=0
  if [ -d "$SKILLS_DIR" ]; then
    skill_count="$(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
  fi

  if [ "$skill_count" -eq 0 ]; then
    ok "S1–S7, S9–S11" "no skill directory under skills/ yet — nothing to check"
  else
    run_skill_checks
  fi

  # ── S8: the two manifests agree with each other and the tree ───
  # Every channel but the Claude Code plugin reads skills/ directly; this is the
  # one that reads a manifest first, so a plugin root that has come away from
  # the tree fails only here. Claude Code installs an update only when the
  # plugin's version changes, so the version has to be there to raise.
  local s8=""
  if [ -d "$MANIFEST_DIR" ] || [ "$skill_count" -ne 0 ]; then
    s8="$(py_s8 "$ROOT")"
  fi
  if [ ! -d "$MANIFEST_DIR" ] && [ "$skill_count" -eq 0 ]; then
    ok S8 "no .claude-plugin/ and no skill yet — nothing to check"
  elif [ -n "$s8" ]; then
    fail S8 "the plugin root and the skill tree came apart:
$s8"
  else
    ok S8 "both manifests parse, name the same plugin, carry a version and load every skill"
  fi

  # ── S17: every eval case is one the runner reads ───────────────
  # The runner refuses a case with an unknown frontmatter key, a grader of an
  # unknown type or a key that type does not take. It costs model calls, so no
  # CI job runs it, and a case it would refuse is caught here instead.
  local s17
  if [ ! -d "$ROOT/evals" ]; then
    ok S17 "no evals/ yet — nothing to check"
  else
    s17="$(py_s17 "$ROOT")"
    if [ -n "$s17" ]; then
      fail S17 "an eval case the runner would refuse:
$s17"
    else
      ok S17 "every eval case has a prompt, known keys and graders of known types"
    fi
  fi

  # ── S18: the plugin root holds Markdown, JSON and PNG only ─────
  # Anthropic's plugin directory refuses scripts and other file types from an
  # unverified organization (spec 002 §1.8).
  local s18
  if [ ! -d "$SKILLS_DIR" ]; then
    ok S18 "no skills/ yet — nothing to check"
  else
    s18="$(py_s18 "$SKILLS_DIR")"
    if [ -n "$s18" ]; then
      fail S18 "a file the plugin directory refuses:
$s18"
    else
      ok S18 "skills/ holds Markdown, JSON and PNG files only, none starting with #!"
    fi
  fi

  # ── S19: a change under skills/ raises the plugin's version ────
  # Claude Code installs an update only when the version changes.
  local base manifest="skills/.claude-plugin/plugin.json" base_version new_version s19
  base="${SKILLS_BASE_REF:-HEAD}"
  if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 || [ "$(git -C "$ROOT" rev-parse --show-toplevel)" != "$(cd "$ROOT" && pwd -P)" ]; then
    ok S19 "not the top of a git checkout — nothing to compare"
  elif [ -z "${base//0/}" ] || ! git -C "$ROOT" rev-parse --verify -q "$base^{commit}" >/dev/null; then
    ok S19 "no base commit to compare with ($base)"
  elif ! git -C "$ROOT" cat-file -e "$base:$manifest" 2>/dev/null; then
    ok S19 "the base $base has no plugin manifest — the first version"
  elif [ -z "$(git -C "$ROOT" diff --name-only "$base" -- skills/; git -C "$ROOT" ls-files --others --exclude-standard -- skills/)" ]; then
    ok S19 "nothing under skills/ changed since $base"
  else
    base_version="$(git -C "$ROOT" show "$base:$manifest" | plugin_version)"
    new_version="$(plugin_version < "$ROOT/$manifest")"
    s19="$(py_s19 "$base_version" "$new_version")"
    if [ -n "$s19" ]; then
      fail S19 "$s19"
    else
      ok S19 "skills/ changed since $base, and the version rose from $base_version to $new_version"
    fi
  fi

  # ── S20: server.json is the registry entry spec 002 §4.4 describes ──
  # mcp-registry.yml publishes it on a tag; the registry refuses a description
  # over 100 characters, and lists whatever remote the file names.
  local s20
  if [ ! -f "$ROOT/server.json" ]; then
    ok S20 "no server.json — nothing to check"
  else
    s20="$(py_s20 "$ROOT")"
    if [ -n "$s20" ]; then
      fail S20 "server.json is not the registry entry spec 002 §4.4 describes:
$s20"
    else
      ok S20 "server.json names io.github.modaal-agent/screens-guide, a description within 100 characters and the one remote"
    fi
  fi

  # ── S15, S16: every reference in a spec resolves for a public reader ──
  # AGENTS.md §"Public-facing text is hermetic". S15 resolves each section
  # reference to a heading; S16 finds a row for each external id the spec cites,
  # and a redaction on each private row. A private name in a working copy fails
  # S16 here, before the push that would publish it.
  local spec_count=0 specs_out s15 s16
  if [ -d "$ROOT/specs" ]; then
    spec_count="$(find "$ROOT/specs" -mindepth 2 -maxdepth 2 -type f \( -name spec.md -o -name 'followup-*.md' \) | wc -l | tr -d ' ')"
  fi
  if [ "$spec_count" -eq 0 ]; then
    ok "S15, S16" "no spec under specs/ — nothing to check"
    return
  fi
  specs_out="$(py_specs "$ROOT")"
  s15="$(printf '%s\n' "$specs_out" | awk -F'\t' '$1 == "S15" { print $2 }')"
  s16="$(printf '%s\n' "$specs_out" | awk -F'\t' '$1 == "S16" { print $2 }')"
  if [ -n "$s15" ]; then
    fail S15 "a section reference in a spec does not resolve:
$s15"
  else
    ok S15 "every section reference in $spec_count spec file(s) resolves"
  fi
  if [ -n "$s16" ]; then
    fail S16 "an external reference in a spec has no row, or a private row is not redacted:
$s16"
  else
    ok S16 "every cited external id has a row, and every private row is redacted"
  fi
}

run_skill_checks() {
  # ── S1: the frontmatter every channel can parse ────────────────
  # `---` on line 1, one `key: value` per line, a closing `---`, and no
  # unquoted value carrying `: `. The last rule is not pedantry: the cross-agent
  # `skills` CLI parses this block with a strict YAML parser and refuses the
  # file with "Nested mappings are not allowed in compact mappings", while
  # Claude Code's own loader accepts it.
  local s1
  s1="$(py_s1 "$SKILLS_DIR")"
  if [ -n "$s1" ]; then
    fail S1 "the frontmatter does not parse for every loader:
$s1"
  else
    ok S1 "frontmatter opens at line 1 and parses"
  fi

  # Parse each skill's frontmatter into <dir>\t<key>\t<value> for the checks
  # below. A nested key is recorded under its parent as `parent.key`.
  local parsed
  parsed="$(py_parsed "$SKILLS_DIR")"

  # ── S2: `name:` is the directory, and is not `synced` ──────────
  # A skill is invoked by its directory name, and `synced` is reserved under
  # ~/.claude/skills/.
  local s2="" dir name
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    name="$(printf '%s\n' "$parsed" | awk -F'\t' -v d="$dir" '$1==d && $2=="name" {print $3}')"
    [ "$name" = "$dir" ] || s2="$s2 $dir(name=$name)"
    [ "$dir" != "synced" ] || s2="$s2 $dir(reserved)"
  done <<< "$(printf '%s\n' "$parsed" | awk -F'\t' '{print $1}' | sort -u)"
  if [ -n "$s2" ]; then
    fail S2 "a skill is invoked by its directory name, so the two cannot differ:$s2"
  else
    ok S2 "name: equals the containing directory"
  fi

  # ── S3: only the Agent Skills standard's keys ──────────────────
  local s3="" key
  while IFS=$'\t' read -r dir key _; do
    [ -n "$key" ] || continue
    case "$key" in *.*) continue ;; esac
    case " $STANDARD_KEYS " in
      *" $key "*) ;;
      *) s3="$s3 $dir/$key" ;;
    esac
  done <<< "$parsed"
  if [ -n "$s3" ]; then
    fail S3 "packaging for the Skills API rejects a Claude Code extension key by name:$s3"
  else
    ok S3 "frontmatter carries only the six standard keys"
  fi

  # ── S4: the description is present and within budget ───────────
  # It is what auto-invocation is decided from, and it is resident in every
  # session whether the skill is used or not.
  local s4="" description length
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    description="$(printf '%s\n' "$parsed" | awk -F'\t' -v d="$dir" '$1==d && $2=="description" {print $3}')"
    length=${#description}
    if [ "$length" -eq 0 ]; then
      s4="$s4 $dir(empty)"
    elif [ "$length" -gt "$DESCRIPTION_MAX" ]; then
      s4="$s4 $dir($length>$DESCRIPTION_MAX)"
    fi
  done <<< "$(printf '%s\n' "$parsed" | awk -F'\t' '{print $1}' | sort -u)"
  if [ -n "$s4" ]; then
    fail S4 "the description is what auto-invocation is decided from:$s4"
  else
    ok S4 "description present and within $DESCRIPTION_MAX characters"
  fi

  # ── S5: the body and each reference within budget ──────────────
  local s5="" file lines limit
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    lines="$(wc -l < "$file" | tr -d ' ')"
    case "$file" in
      */SKILL.md) limit=$SKILL_BODY_MAX ;;
      *) limit=$REFERENCE_MAX ;;
    esac
    [ "$lines" -le "$limit" ] || s5="$s5 ${file#"$ROOT"/}($lines>$limit)"
  done <<< "$(find "$SKILLS_DIR" -name '*.md' | sort)"
  if [ -n "$s5" ]; then
    fail S5 "over budget:$s5"
  else
    ok S5 "SKILL.md ≤ $SKILL_BODY_MAX lines, each reference ≤ $REFERENCE_MAX"
  fi

  # ── S6: every relative link resolves ───────────────────────────
  # A skill installs as a directory, so a link out of it — to a file in this
  # repository the adopter never receives — is a link to nothing.
  local s6
  s6="$(py_s6 "$SKILLS_DIR")"
  if [ -n "$s6" ]; then
    fail S6 "a link in the skill tree points at a file that does not exist:
$s6"
  else
    ok S6 "every relative link resolves"
  fi

  # ── S7: every skill directory holds a SKILL.md ─────────────────
  # A directory without one loads as nothing, in silence.
  local s7=""
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    [ -f "$dir/SKILL.md" ] || s7="$s7 $(basename "$dir")"
  done <<< "$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.*' | sort)"
  if [ -n "$s7" ]; then
    fail S7 "a directory under skills/ carries no SKILL.md:$s7"
  else
    ok S7 "every directory under skills/ holds a SKILL.md"
  fi

  # ── S9: README.md lists every skill ────────────────────────────
  # The index is maintained by hand, so this is what keeps it current.
  local s9="" base
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    base="$(basename "$dir")"
    grep -qF "skills/$base/" "$README" || s9="$s9 $base"
  done <<< "$(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d ! -name '.*' | sort)"
  if [ -n "$s9" ]; then
    fail S9 "a skill the README does not mention as skills/<name>/:$s9"
  else
    ok S9 "README.md lists every skill directory"
  fi

  # ── S10: a skill that names another skill names one that exists ─
  # The skills refer to each other by name, and a name in prose is not a link,
  # so S6 does not see it. A rename or a deletion fails here instead.
  local s10
  s10="$(py_s10 "$SKILLS_DIR")"
  if [ -n "$s10" ]; then
    fail S10 "a skill names a skill that does not exist:
$s10"
  else
    ok S10 "every skill a skill names is a directory under skills/"
  fi

  # ── S11: AGENTS.md and CLAUDE.md are named together ────────────
  # A skill that tells an agent to edit AGENTS.md alone leaves CLAUDE.md behind,
  # and the adopter's rules check fails on the next pull request.
  local s11
  s11="$(py_s11 "$SKILLS_DIR")"
  if [ -n "$s11" ]; then
    fail S11 "a file names one agent rules file without the other:
$s11"
  else
    ok S11 "every file under skills/ that names AGENTS.md or CLAUDE.md names both"
  fi
}

# ── the self-test ────────────────────────────────────────────────
# Each check is run against a fixture tree seeded with exactly one violation of
# it. A check that has never gone red is a check that has not been run. The
# fixture is built here rather than copied from the checkout, so the self-test
# passes on a tree with no skills in it yet.

seed_fixture() {
  local target="$1"
  mkdir -p "$target/skills/fixture-skill/references" "$target/.claude-plugin"

  cat > "$target/skills/fixture-skill/SKILL.md" <<'FIXTURE'
---
name: fixture-skill
description: A valid skill the self-test seeds one violation into. Use when running scripts/check-skills.sh --self-test.
license: MIT
---

# Fixture skill

The body the self-test edits. See [references/notes.md](references/notes.md).
FIXTURE

  echo "Notes the fixture body links to." > "$target/skills/fixture-skill/references/notes.md"
  echo "The index mentions skills/fixture-skill/ so S9 passes." > "$target/README.md"

  cat > "$target/.claude-plugin/marketplace.json" <<'FIXTURE'
{
  "name": "fixture",
  "owner": { "name": "fixture", "url": "https://example.com" },
  "plugins": [{ "name": "fixture", "source": "./skills" }]
}
FIXTURE

  mkdir -p "$target/skills/.claude-plugin"
  cat > "$target/skills/.claude-plugin/plugin.json" <<'FIXTURE'
{ "name": "fixture", "version": "1.0.0", "skills": "./fixture-skill", "license": "MIT" }
FIXTURE
}

seed_eval() {
  mkdir -p "$1/evals/fixture-case/graders"
  cat > "$1/evals/fixture-case/prompt.md" <<'FIXTURE'
---
description: A valid case the self-test seeds one violation into.
allowed_tools: [Read, Skill]
max_turns: 4
---

A prompt.
FIXTURE
  cat > "$1/evals/fixture-case/graders/skill-fired.md" <<'FIXTURE'
---
type: tool_used
tool: Skill
min: 1
arm: with-only
---
FIXTURE
}

seed_server() {
  cat > "$1/server.json" <<'FIXTURE'
{
  "name": "io.github.modaal-agent/screens-guide",
  "description": "A valid entry the self-test seeds one violation into.",
  "version": "1.0.0",
  "remotes": [{ "type": "streamable-http", "url": "https://screens.guide/mcp" }]
}
FIXTURE
}

# A git checkout of the fixture with one commit, for S19.
seed_git() {
  git -C "$1" init -q
  git -C "$1" add -A
  git -C "$1" -c user.name=fixture -c user.email=fixture@example.com -c commit.gpgsign=false commit -q -m fixture
}

seed_spec() {
  mkdir -p "$1/specs/001-fixture"
  cat > "$1/specs/001-fixture/spec.md" <<'FIXTURE'
# 001 — Fixture spec

## 1. Current state

The fact in §1 comes from E1.

## 2. External references

| id | reference | public | URL and pin | cited in |
| --- | --- | --- | --- | --- |
| E1 | a public page | yes | https://example.com; read 2026-01-01 | §1 |
FIXTURE
}

expect_red() {
  local check="$1" root="$2" output status
  set +e
  output="$("$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")" "$root" 2>&1)"
  status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    printf '✘ %s stayed green against its seeded violation\n' "$check" >&2
    return 1
  fi
  if ! printf '%s\n' "$output" | grep -q "✘ $check "; then
    printf '✘ %s did not report; the run said:\n%s\n' "$check" "$output" >&2
    return 1
  fi
  printf '✔ %s red against its seeded violation\n' "$check"
}

WORK=""
self_test() {
  local seed check root skill spec red=0
  WORK="$(mktemp -d)"
  # The trap runs after the function returns, so the directory it removes
  # cannot be a local.
  trap 'rm -rf "$WORK"' EXIT

  # A seed is a check name, with a suffix after "-" when one check has two.
  for seed in S1 S2 S3 S4 S5 S6 S7 S8 S8-version S9 S10 S11 S15 S16 S16-redaction S17 S17-type S17-key S18 S18-shebang S19 S20 S20-remote; do
    check="${seed%%-*}"
    root="$WORK/$seed"
    mkdir -p "$root"
    seed_fixture "$root"
    skill="$root/skills/fixture-skill/SKILL.md"
    spec="$root/specs/001-fixture/spec.md"
    case "$seed" in
      S1) perl -0pi -e 's/^license:.*$/license: MIT: the file is unparseable now/m' "$skill" ;;
      S2) perl -0pi -e 's/^name: .*$/name: fixture-skills/m' "$skill" ;;
      S3) perl -0pi -e 's/^license:/when_to_use: whenever\nlicense:/m' "$skill" ;;
      S4) perl -0pi -e 's/^description: .*$/description:/m' "$skill" ;;
      S5) for _ in $(seq 1 "$SKILL_BODY_MAX"); do echo "padding" >> "$skill"; done ;;
      S6) echo 'See [references/missing.md](references/missing.md).' >> "$skill" ;;
      S7) mkdir -p "$root/skills/no-body" ;;
      S8) perl -0pi -e 's/"name": "fixture"/"name": "fixture-plugin"/' "$root/skills/.claude-plugin/plugin.json" ;;
      S8-version) perl -0pi -e 's/"version": "1.0.0", //' "$root/skills/.claude-plugin/plugin.json" ;;
      S9) echo "An index that mentions no skill directory." > "$root/README.md" ;;
      S10) echo 'Invoke the `missing-skill` skill first.' >> "$skill" ;;
      S11) echo 'Add the rule to AGENTS.md.' >> "$skill" ;;
      S15)
        seed_spec "$root"
        perl -0pi -e 's/comes from E1\./comes from E1, and §9 has the rest./' "$spec"
        ;;
      S16)
        seed_spec "$root"
        perl -0pi -e 's/comes from E1\./comes from E1 and E2./' "$spec"
        ;;
      S16-redaction)
        seed_spec "$root"
        perl -0pi -e 's/comes from E1\./comes from E1 and E2./' "$spec"
        echo '| E2 | notes from a private repository | no | — | §1 |' >> "$spec"
        ;;
      S17)
        seed_eval "$root"
        perl -0pi -e 's/^max_turns: 4$/max_turns: 4\nretries: 2/m' "$root/evals/fixture-case/prompt.md"
        ;;
      S17-type)
        seed_eval "$root"
        perl -0pi -e 's/^type: tool_used$/type: judge/m' "$root/evals/fixture-case/graders/skill-fired.md"
        ;;
      S17-key)
        seed_eval "$root"
        perl -0pi -e 's/^min: 1$/min: 1\nnot: true/m' "$root/evals/fixture-case/graders/skill-fired.md"
        ;;
      S18) mkdir -p "$root/skills/fixture-skill/scripts" && echo 'echo hi' > "$root/skills/fixture-skill/scripts/run.sh" ;;
      S18-shebang) printf '#!/bin/sh\necho hi\n' > "$root/skills/fixture-skill/references/run.md" ;;
      S19)
        seed_git "$root"
        echo 'A change with no version raise.' >> "$skill"
        ;;
      S20)
        seed_server "$root"
        perl -0pi -e 's/"description": "[^"]*"/"description": "'"$(printf 'x%.0s' $(seq 1 101))"'"/' "$root/server.json"
        ;;
      S20-remote)
        seed_server "$root"
        perl -0pi -e 's#https://screens.guide/mcp#https://example.com/mcp#' "$root/server.json"
        ;;
    esac
    expect_red "$check" "$root" || red=1
  done

  if [ "$red" -ne 0 ]; then
    printf '\n✘ self-test: a check did not go red\n' >&2
    exit 1
  fi
  printf '\n✔ self-test: every check red against its seeded violation\n'
}

if [ "$SELF_TEST" -eq 1 ]; then
  self_test
  printf '\nnow the checkout itself:\n'
fi

run_checks
if [ "$FAILED" -ne 0 ]; then
  printf '\n✘ skill checks failed\n' >&2
  exit 1
fi
printf '\n✔ skill checks passed\n'
