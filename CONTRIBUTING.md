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
| `npx wrangler dev` | none; run it after changing `wrangler.jsonc`, `public/_headers` or the build | `dist/` and `/mcp` as the Worker serves them: check that each URL answers with its `Content-Type`, an unknown path answers 404, and the headers of `public/_headers` arrive; `tests/hosting.test.ts` reads both files |
| `npm test` | `site` | vitest: `tests/*.test.ts`, among them one seeded violation per data rule; `tests/site.test.ts` reads `dist/` and fails on a device missing from the home page table or without a page or JSON file, a page without its `.md` copy, a page missing from `llms.txt` or the sitemap, a link to a file the build did not write, and a word joined to the value after it (Astro drops the line break before a line that starts with `{` or an inline element; keep the word and the value on one line); `tests/skill.test.ts` fails when `references/devices.md` differs from `npm run gen:skill`'s output or a number in `SKILL.md` from the dataset; `tests/mcp.test.ts` and `tests/negotiation.test.ts` drive the Worker's `fetch` with its bindings stubbed and the assets read from `dist/`; `tests/conformance.test.ts` starts `wrangler dev` on a free port, calls every tool through the MCP TypeScript SDK's client, and requests every page with `Accept: text/markdown` |

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
| S17 | an eval case under `evals/` with no `prompt.md` body, a frontmatter key the runner does not read, no grader, a grader type the runner does not know or a key that type does not take; an `evals/` under `skills/` |
| S18 | a file under `skills/` that is not Markdown, JSON or PNG, starts with `#!`, or is a symbolic link |
| S19 | a change under `skills/` since the base commit with `plugin.json`'s `version` not raised. The base is `$SKILLS_BASE_REF`, which `ci.yml` sets to the pull request's base or the push's previous commit, else `HEAD` |

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

## The Worker and the MCP server

`worker/index.ts` is the Worker script. `run_worker_first` in `wrangler.jsonc` sends it the paths
of `RUN_WORKER_FIRST` in `worker/routes.ts`: `/mcp`, the page routes and the counted files.
Cloudflare serves every other path from `dist/` without running it, unless no file matches.

- A page route (`PAGE_ROUTES`) answers with the page's `.md` copy when `Accept` names
  `text/markdown` at least as high as `text/html`, and with the HTML and a `Link` header to the copy
  otherwise (`worker/site.ts`). Both responses carry `Vary: Accept`. A counted file
  (`COUNTED_FILES`) is the asset unchanged. Each sends `page_served` or `file_served`.
- To add a page route, add its pattern to `PAGE_ROUTES` and to `run_worker_first`.
  `tests/hosting.test.ts` fails when the two lists differ, or when a page or counted file in `dist/`
  matches no pattern.
- `public/_headers` applies to every response the Worker takes from `env.ASSETS`, matched on the
  URL it fetched: a negotiated copy carries the `/*.md` rule's headers.

- `worker/mcp.ts` answers the JSON-RPC methods `initialize`, `ping`, `tools/list` and
  `tools/call`, one JSON response per POST, with no session and no event stream.
- To add a tool, write a `Tool` in `worker/tools.ts` with its `inputSchema`, its `outputSchema` and
  `run`, and add it to `TOOLS`. `withDefs` copies the dataset schema's `$defs` an output schema
  names. `/agents` lists `TOOLS`. Add the tool's calls to `tests/mcp.test.ts`, which validates each
  result against its `outputSchema` with Ajv, and to the list in `tests/conformance.test.ts`.
- `worker/arguments.ts` checks a tool's arguments, because the Workers runtime refuses the code
  generation Ajv uses. It reads the keywords `type`, `properties`, `required`,
  `additionalProperties`, `items`, `enum`, `minimum`, `minLength`, `maxLength`, `minItems` and
  `maxItems`; `tests/mcp.test.ts` fails on an input schema with any other keyword. Add a keyword to
  both before using it.
- An argument the tool cannot serve, such as an unknown device id, returns a result with `isError`
  and text naming the valid values, so the agent can correct the call; a JSON-RPC error is for a
  malformed request.
- The Worker's events are rows of `WORKER_EVENT_DOCS` in `worker/analytics.ts`, which `/privacy`
  lists beside the pages' events. They are sent only for requests to `screens.guide`.
- `toolEventProperties` in `worker/tools.ts` writes a tool call's event: only enum values, device
  ids and runtimes the dataset knows, and counts. A string the client sent never reaches an event.
- `public/_headers` does not apply to a response the script builds itself. `SECURITY_HEADERS` in
  `worker/mcp.ts` carries the same headers for `/mcp`.
- The day limit reads `MCP_DAY_LIMIT` from the environment when it is set, so
  `npx wrangler dev --var MCP_DAY_LIMIT:12` reaches the limit in a few requests. Deploy without it.

## Skills, the plugin and the eval cases

The layout:

```
.claude-plugin/marketplace.json        # the repository root is the marketplace; one entry, source ./skills
skills/                                # the plugin root: Markdown, JSON and the icon only
  .claude-plugin/plugin.json           # name, version, "skills", icon and listing URLs
  .claude-plugin/icon.png              # rendered from assets/plugin-icon.svg, the command in its comment
  .mcp.json                            # the MCP server, https://screens.guide/mcp, type http
  <name>/SKILL.md                      # the resident body
  <name>/references/*.md               # opened per task
  screens-guide/references/devices.md  # written by npm run gen:skill from data/devices.json; never edit it
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
   [evals/README.md](evals/README.md) lists the cases and how to write one.

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
