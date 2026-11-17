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
- Before the pull request, run the commands of §"Checks" and fix what they report.
- A wrong measurement is fixed at its source and exported again; open an issue naming the device,
  the runtime and the field. A pull request that edits `data/devices.json` by hand is closed.

## Checks

| command | ci.yml job | what it fails on |
| --- | --- | --- |
| `bash scripts/check-agent-rules.sh` | `rules` | `CLAUDE.md` differs from `AGENTS.md`; fix with `cp AGENTS.md CLAUDE.md` |
| `scripts/check-skills.sh` | `skills` | each check in the table below |
| `scripts/check-skills.sh --self-test` | `skills` | a check that stays green against a fixture seeded with its violation |
| `npm run check:data` | `site` | `data/devices.json` against `data/schema.json`, and the rules of spec 001 §6: insets leave a safe area, corner radii at most half the shorter side, pixels equal to the window times the scale or density, unique ids and readings, a `current` build that has readings and is not a pre-release, a reason for every null field, a `data/CHANGELOG.md` entry for `version` |
| `npm run check` | `site` | astro check: a type error in a page, a component or `src/lib/` |
| `npm run build` | `site` | a page that fails to render |
| `npm test` | `site` | vitest: `tests/*.test.ts`, among them one seeded violation per data rule; `tests/site.test.ts` reads `dist/` and fails on a device missing from the home page table or without a page or JSON file, a page without its `.md` copy, a page missing from `llms.txt` or the sitemap, a link to a file the build did not write, and a word joined to the value after it (Astro drops the line break before a line that starts with `{` or an inline element; keep the word and the value on one line) |

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

## Pages and their Markdown copies

Each page's content is a `Doc` in `src/lib/pages/`: its title, description, heading and blocks
(`src/lib/doc.ts`). Paragraphs and table cells are inline Markdown limited to `` `code` ``,
`[label](/path)` and `**strong**`. `src/components/DocBlocks.astro` renders the blocks as HTML, and
`markdownCopy()` writes them as the page's `.md` copy, with site-relative links made absolute.

- To change a page's text, edit its module in `src/lib/pages/`, not the `.astro` file.
- To add a drawing or another part with no Markdown form, add a `slot` block and fill the slot of
  that name in the `.astro` page. Give the block a `markdown` alternative when it shows values.
- To add a page, write its module, its `.astro` file, and add it to `sitePages()` in
  `src/lib/pages/index.ts`; `[page].md.ts`, the sitemap and `llms.txt` read that list, and
  `tests/site.test.ts` fails until the page, its copy and its entries exist.
- Write each sentence of an `.astro` file's own text on one line with the values in it: Astro drops
  the line break before a line that starts with `{` or an inline element.

## Islands, analytics and the content security policy

- An island is a Preact component in `src/islands/`, hydrated with `client:visible`. It imports
  `src/lib/format.ts`, `rows.ts`, `drawing.ts` and `geometry.ts`, never `src/lib/data.ts`, which
  would put all of `data/devices.json` into the browser bundle; the page passes it what it needs as
  props. `tests/site.test.ts` fails when a script under `dist/_astro/` holds a run id of the
  dataset.
- `astro.config.mjs` sets the content security policy (`security.csp`). Astro writes it into each
  page's `<meta>` tag with the hashes of the inline scripts and styles it writes for the islands.
  Write no other inline `<script>` (JSON-LD excepted) and no `style` attribute: `tests/site.test.ts`
  checks every page. Set a style from an island through the DOM, which the policy allows.
- An event is a key of `Events` in `src/lib/analytics.ts` and a row of `EVENT_DOCS`, which
  `/privacy` lists; spec 001 §5.5 lists it first. `startAnalytics` starts PostHog on
  `screens.guide` only; `tests/analytics.test.ts` checks the host and the options.

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
