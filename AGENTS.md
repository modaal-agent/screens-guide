# Agent rules

Rules for an agent working in screens-guide. They add to [CONTRIBUTING.md](CONTRIBUTING.md)
and do not summarize it.

`AGENTS.md` and `CLAUDE.md` are one file kept in two places, byte for byte. Edit `AGENTS.md`,
then `cp AGENTS.md CLAUDE.md`. `bash scripts/check-agent-rules.sh` fails when the two differ.

**Read first, by question:**

| you need | read |
| --- | --- |
| what this repository is and how to build and run it | [README.md](README.md) |
| how a change is made, checked and reviewed | [CONTRIBUTING.md](CONTRIBUTING.md) |
| what each check fails on | [CONTRIBUTING.md](CONTRIBUTING.md) §"Checks" |
| how a vulnerability is reported, and what counts as one | [SECURITY.md](SECURITY.md) |
| which license covers a path | [README.md](README.md) §"License" |
| the plan for the site, the dataset, the pages and the analytics | [specs/001-site-and-dataset/spec.md](specs/001-site-and-dataset/spec.md) |
| the plan for the MCP server, Markdown negotiation, the skill and the plugin | [specs/002-agent-interfaces/spec.md](specs/002-agent-interfaces/spec.md) |
| how new measurements reach the dataset | [specs/003-data-rounds/spec.md](specs/003-data-rounds/spec.md) |
| the plan for a change too big to carry in a commit message | `specs/` |

Run from the repository root:

```bash
bash scripts/check-agent-rules.sh     # AGENTS.md and CLAUDE.md are byte-identical (ci.yml, `rules`)
scripts/check-skills.sh               # skills, plugin manifests, spec references (ci.yml, `skills`)
scripts/check-skills.sh --self-test   # each check red against a seeded violation (ci.yml, `skills`)
npm ci && npm run check:data          # data/devices.json against data/schema.json and its rules (ci.yml, `site`)
npm run check && npm run build        # astro check, then the site into dist/ (ci.yml, `site`)
npm test                              # vitest; the site tests read dist/ (ci.yml, `site`)
```

## State a rule once

- The frontmatter keys and the budgets are `STANDARD_KEYS`, `SKILL_BODY_MAX`, `REFERENCE_MAX` and
  `DESCRIPTION_MAX` in `scripts/check-skills.sh`; S3, S4 and S5 read them. Documents name the
  check, not the value.
- The plugin's name is `name` in `skills/.claude-plugin/plugin.json`, and
  `.claude-plugin/marketplace.json` has one entry with that name. S8 compares the two.
- README.md's skill table is the index of `skills/`. S9 fails a skill directory it does not mention.
- The PostHog project token and host are written once, as constants in `src/lib/analytics.ts`; the
  pages and the Worker import them (spec 001 §5.5).

## What goes in which document

- **README.md**: what this repository is, how to build, install or run it, and its layout.
- **CONTRIBUTING.md**: how a change is made, checked and reviewed, and the licensing of a
  contribution.
- **SECURITY.md**: how a vulnerability is reported, and what counts as one here.
- **AGENTS.md / CLAUDE.md**: rules only, and one file in two places. A paragraph explaining
  what something *is* goes in one of the other documents.
- **specs/NNN-slug/spec.md**: the plan for a change too big to carry in a commit message: what
  is true now, what changes, the phasing and the decisions.
- **skills/`<name>`/**: what an agent does in someone else's repository, and nothing about how this
  repository is built.

## Writing style

**Scope: every piece of prose an agent writes here**: documents, code comments, commit messages,
pull-request descriptions, review comments, and replies in chat.

1. **Every sentence gives the reader a fact they can check or an action they can take**, with the
   referent named: the file, the line, the command, the number, the date. Delete a sentence that
   does neither.
2. **Write the way you would say it to a colleague.** Reread each sentence, and rewrite any you
   would not say aloud.
3. **Use short words, short sentences and short paragraphs.** Split a sentence over 25 words, and
   keep a paragraph to five sentences.
4. **Cut needless words**: "in order to", "just", "simply", "please note", "it is important to
   note", and "additionally" at the start of a sentence.
5. **Use the active voice, and start a statement with its verb.** Write "is" where "serves as" or
   "stands as" appears, and rewrite "there is" and "there are" around the subject.
6. **Say what is.** Replace "it's not X, it's Y", "not just X but Y", and any phrasing that names
   only what is absent, with a statement of what is there.
7. **Be definite, specific and concrete**: the number instead of the adjective, the path instead of
   "the config", the date instead of "recently".
8. **Use no figure of speech you have seen in print, and no metaphor as the only statement of a
   point.** Documents do not owe, want or know things: name who does the work, and where.
9. **Use no jargon, buzzwords or extravagant adjectives**, such as leverage, robust, streamline,
   empower, tackle, facilitate, vibrant, groundbreaking and pivotal.
10. **Do not inflate significance.** Nothing "underscores", "highlights" or "marks a turning
    point". Give the value before, the value after, and the date it was measured.
11. **Write no rhythm devices**: no list of three kept for its cadence, no aphoristic pairing, no
    dramatic reversal, no contrast standing in for content, no closing line that draws a moral.
    End when the content ends.
12. **Say what the reader is to do, and where**: the command to run, the file to edit, the person
    to ask.

Break any of these rules sooner than write something unclear.

*Maintained by the `writing-style` skill down to this line. This repository's own lines go below.*

In this repository the scope also covers page text, the Markdown copies, `llms.txt`, the MCP
server's tool descriptions, and skill bodies and their references under `skills/`.

## Git and pull requests

- **Commit, amend, push or rewrite history only when the user confirms it in the current turn.**
  A request to write the code, or approval of an earlier commit, does not cover the next commit.
  When the work is ready, stop, summarize what changed, and ask.
- **Leave the index and the working tree as the user left them.** Run `git add`, `git reset`,
  `git stash` or `git checkout -- <path>` only when the user asks for it in this turn. What is
  staged is the reviewer's record of how far they have read. When a commit is confirmed and the
  index is partly staged, ask which scope to commit before running anything.
- **Write the subject line in the imperative, naming the change**: "Fail the build on a missing
  license header". Work that follows a spec carries the spec's directory name as a prefix,
  `[NNN-slug]`, starting with the commit that writes the spec. Work without a spec carries no prefix.
- **A change reaches the default branch through a pull request**, so CI runs before it lands.
  Create a branch when the work starts; when finished work sits on the default branch, ask which
  branch to move it to. Pushing, opening a pull request and merging each need their own go-ahead.

Decisions for this repository:

- **Default branch:** `main`.
- **Merge strategy:** Merge, rebase or squash, chosen per pull request.
- **Branch names:** A spec's work goes on a branch named after the spec's directory, `NNN-slug`; other work on a branch named after its topic.

*Maintained by the `git-discipline` skill down to this line. This repository's own lines go below.*

In this repository:

- **A spec's commit series**, for spec 002's phases, reads:

  ```
  [002-agent-interfaces] Serve the MCP tools from the Worker
  [002-agent-interfaces] Answer Accept: text/markdown with each page's Markdown copy
  [002-agent-interfaces] Publish the skill as a Claude Code plugin
  ```

- **Specs that cite each other's sections land in one commit**, so every reference resolves at
  every commit (S15).

- **CI runs on a pull request and on a push to `main`.** [`ci.yml`](.github/workflows/ci.yml)
  triggers on both, so a push to a branch with no pull request open runs nothing.
- **A commit that changes the dataset quotes the exporter's counts** of devices, runtimes and
  readings in its message (spec 001 §2.5).

## Specs

- **Write a spec for a change too big to describe in a commit message**, in
  `specs/NNN-slug/spec.md`: `NNN` counts up from `001`, and the slug names the feature.
- **Writing a spec is not authorization to implement it.** When the task is a spec, write the
  document alone, then stop and ask.
- **While the feature is in progress, edit the spec in place** to keep the plan current. Where later
  work overturns an important decision, leave a short note saying what it replaced and why.
- **Once the feature is done, amend the spec by addition.** A feature is done when the commit that
  lands its last planned phase reaches the default branch. An addition that supersedes a claim names
  that claim's section, and the section takes a line pointing to the addition. A closed spec may
  take a follow-up file beside it instead, `followup-<topic>.md`, under the same rule.
- **A new spec names what it obsoletes**, by number and section: "obsoletes 001 §4.6".
- **Every reference in a spec resolves for its reader.** A section reference points at a heading in
  the same file. An external reference is to a public source, pinned where the spec cites a line, a
  count or a quotation, and has a row in the spec's `External references` section. In a public
  repository, a private reference is named only in that section, and redacted before the commit
  carrying it is pushed.

*Maintained by the `spec-driven-development` skill down to this line. This repository's own lines go below.*

In this repository:

- **The default branch is `main`**, so a feature is done when the commit landing its last planned
  phase reaches `main`.
- **When the task is a spec, the spec document is the whole change**: no page, script, workflow or
  skill edit, not even the one line that looks ready.
- **Each phase lands as its own commit under the spec's prefix**, and its row in the spec's
  "What each phase landed" table names the commit and any departure from the plan.

## Public-facing text is hermetic

The origin is public. Everything pushed to it is readable by anyone: files on every branch, commit
messages, pull-request titles, bodies and review comments, and the site built from them.

- **Name no private repository, internal path, internal project or internal numbering**, in any
  file, commit message or page. The measurement runs, the probes that read the devices and the
  exporter stay in a private repository (spec 001 D8); state a finding from them by what was
  measured, on which device and runtime, and when.
- **Every internal cross-reference resolves at the same commit**: a `§N.M` to a heading or a
  numbered definition in the same document, "spec NNN §N" to a heading in
  `specs/NNN-<slug>/spec.md`, `file:line` to that line. S15 checks the spec references.
- **Every external reference is to a public source**, pinned to a commit, page revision or version
  where the text cites a line, a count or a quotation.
- **A private reference is named only in its spec's `External references` row**, and the row is
  redacted to a text starting `*Redacted:*` before the commit carrying it is pushed. S16 checks it.
  Run `scripts/check-skills.sh` before every push that carries a spec.

## The dataset and the pages

- **`data/devices.json` changes only by an export** from the private measurement repository
  (spec 001 §2.5). Each change raises `version` and adds a `data/CHANGELOG.md` entry. Never edit a
  value by hand: a wrong value is fixed in the run notes and exported again.
- **A value no run measured is `null` with a reason**, never an estimate or a spec-sheet number
  (spec 001 D5).
- **Pages, data copies, Markdown copies and `llms.txt` are generated from `data/devices.json`.** A
  page holds no number of its own.
- **Send no usage event the specs do not list** (spec 001 §5.5, spec 002 §2.5). A new event, or a
  new property on one, changes the spec, the code and `/privacy` in the same pull request.

## The skill and the plugin

- **A skill is written for an agent in someone else's repository**, working on a mobile screen.
  How this repository is built, its checks and its specs go in CONTRIBUTING.md, never in a skill.
- **Frontmatter carries the Agent Skills standard's six keys only**, one per line, with any value
  holding `: ` quoted, and `name:` equal to the directory name. S1, S2 and S3 check them.
- **`description` names the triggers**: the task, the file, the API, the error text. It is
  resident in every session, and auto-invocation is decided from it alone. S4 holds its length.
- **Keep `SKILL.md` under 5,000 tokens**, as `claude plugin details` reports it: compaction keeps
  the first 5,000 tokens of a loaded skill. The line budgets of S5 do not hold a token budget. Move
  material to `references/` before the body reaches it.
- **Write no version literal into a skill.** A measured number in a skill's body names its device
  and runtime; the full device table is `references/devices.md`, which the build generates from the
  dataset (spec 002 §4.1).
- **A link that leaves a skill's directory is an absolute `https://` URL.** Every install channel
  but the plugin copies the skill's directory alone. S6 checks the relative links.
- **The plugin root, `skills/`, holds Markdown, JSON and the plugin's PNG icon only.** Anthropic's
  plugin directory refuses a script, an executable or a package manager file from an unverified
  organization, whatever its name.
- **Raise `version` in `skills/.claude-plugin/plugin.json` in every pull request that changes a
  file under `skills/`**: the patch number for a correction, the minor number for new guidance or a
  new reference, the major number for a renamed or removed skill. A dataset export that
  regenerates `references/devices.md` raises the patch number. Claude Code installs an update only
  when the version changes.
- **Eval cases live in `evals/`, outside the plugin root**: the eval runner refuses a case
  directory inside `skills/`. No CI job runs them, because each run costs model calls. Run them
  before a pull request that changes a description or a body, and quote the round's scores in the
  commit message.
- **Run `claude plugin validate --strict .` and `claude plugin validate --strict ./skills`** before
  a push that changes either manifest, and quote the result in the commit message.
