# Contributing

How a change to screens-guide is made, checked and reviewed.

For the rules an agent working here follows, see [AGENTS.md](AGENTS.md), the same file as
[CLAUDE.md](CLAUDE.md).

## This repository is public

Everything here is world-readable once it is pushed: files, commit messages, pull requests and the
site built from them. The measurements come from runs in a private repository; describe a finding
by the device, the runtime and the date it was read, and name no private repository, internal path
or internal document. A spec lists its external references in an `External references` section, and
a private one is redacted there before the commit carrying it is pushed.

## Making a change

- Branch from `main`, and open a pull request to merge back into it. A spec's work goes on a branch
  named after the spec's directory, such as `001-site-and-dataset`.
- Write the spec first, in `specs/NNN-slug/spec.md`, when the change is too big to describe in a
  commit message.
- Before the pull request, run the three commands of §"Checks" and fix what they report.
- A wrong measurement is fixed at its source and exported again; open an issue naming the device,
  the runtime and the field. A pull request that edits `data/devices.json` by hand is closed.

## Checks

| command | ci.yml job | what it fails on |
| --- | --- | --- |
| `bash scripts/check-agent-rules.sh` | `rules` | `CLAUDE.md` differs from `AGENTS.md`; fix with `cp AGENTS.md CLAUDE.md` |
| `scripts/check-skills.sh` | `skills` | each check in the table below |
| `scripts/check-skills.sh --self-test` | `skills` | a check that stays green against a fixture seeded with its violation |

No network and no build: bash, find, grep, awk, perl and python3. `--self-test` builds a valid
fixture tree in a temporary directory once per seeded violation, and fails if the check it targets
stays green. Run it after editing a check.

| check | what it fails on |
| --- | --- |
| S1 | frontmatter that does not open at line 1, does not close, or carries an unquoted value with `: ` |
| S2 | `name:` that is not the directory name, or the reserved name `synced` |
| S3 | a frontmatter key outside the Agent Skills standard's six |
| S4 | a missing `description`, or one longer than the budget |
| S5 | a `SKILL.md` or a reference longer than its budget |
| S6 | a relative link pointing at a file that does not exist |
| S7 | a directory under `skills/` with no `SKILL.md` |
| S8 | manifests that do not parse; a marketplace with other than one plugin, or whose entry's `source` is not a `./` path; a `plugin.json` whose `name` differs from the entry's, whose `version` is not `MAJOR.MINOR.PATCH`, or whose `skills` path does not load every skill |
| S9 | a skill directory README.md does not mention as `skills/<name>/` |
| S10 | a backticked name followed by "skill" or "skills", in a `.md` under `skills/`, that is not a directory under `skills/` |
| S11 | a file under `skills/` that names `AGENTS.md` without `CLAUDE.md`, or `CLAUDE.md` without `AGENTS.md` |
| S15 | in a spec, a `§N` or `§N.M` with no matching heading or numbered definition; a `§"Title"` after a file name with no heading in that file beginning with the title; a "spec NNN §N" that does not resolve |
| S16 | a spec with no `External references` section, an `E` id it cites with no row there, a public cell other than `yes` or `no`, or a `no` row that does not start `*Redacted:*` |

The check ids follow `scripts/check-skills.sh` in
[modaal-agent/skills](https://github.com/modaal-agent/skills), which this script is adapted from.
The budgets and the key list are `STANDARD_KEYS`, `SKILL_BODY_MAX`, `REFERENCE_MAX` and
`DESCRIPTION_MAX` in `scripts/check-skills.sh`. Change a number there, not in a document.

## Skills, the plugin and the eval cases

The skill and the plugin arrive with spec 002 phase 4. They follow this layout:

```
.claude-plugin/marketplace.json        # the repository root is the marketplace; one entry, source ./skills
skills/                                # the plugin root: Markdown, JSON and the icon only
  .claude-plugin/plugin.json           # name, version, "skills", icon and listing URLs
  .claude-plugin/icon.png
  <name>/SKILL.md                      # the resident body
  <name>/references/*.md               # opened per task
evals/<case>/prompt.md                 # one eval case: the prompt, with its frontmatter
evals/<case>/graders/<grader>.md       # one grader per file
```

Adding to a skill:

1. Edit `skills/<name>/SKILL.md` or a reference, within the budgets S5 checks, and keep the body
   under the token budget in [AGENTS.md](AGENTS.md) §"The skill and the plugin":
   `claude plugin details` prints it.
2. Raise `version` in `skills/.claude-plugin/plugin.json` in the same pull request.
3. Run `claude plugin validate --strict .` and `claude plugin validate --strict ./skills`.
4. Run the eval cases, and quote the scores and the cost in the commit message.

The eval runner reads cases only from inside a plugin's root, and refuses a case directory inside
`skills/`. A round copies the plugin and `evals/` into one scratch directory first:

```bash
run=$(mktemp -d) && cp -R skills/. "$run" && cp -R evals "$run/evals"
claude plugin eval "$run" --ablation with-without --runs 1 --no-publish --trust-plugin \
  --output-dir "evals/results/$(date +%Y-%m-%dT%H-%M-%S)"
```

`evals/results/` is ignored by git. No CI job runs the cases: each run costs model calls.

## Licensing

Two licenses, each inbound = outbound:

- A contribution to `data/` is licensed under CC BY 4.0, the terms in [LICENSE-DATA](LICENSE-DATA).
- Every other contribution is licensed under the MIT License, the terms in [LICENSE](LICENSE).

Opening a pull request means your contribution is licensed under the license for its path. Each
`SKILL.md` carries `license: MIT` in its frontmatter, so the license travels with the skill's
directory through every install channel.
