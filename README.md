# screens-guide

[![CI](https://github.com/modaal-agent/screens-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/modaal-agent/screens-guide/actions/workflows/ci.yml)

The source of [screens.guide](https://screens.guide): the screen sizes, safe-area insets, corner
radii, system bars and margins of iPhones, iPads and Android devices, as measured on Xcode
simulators and Android emulators. The site publishes them for coding agents first, as JSON, CSV, a
JSON Schema, `llms.txt`, Markdown copies, an MCP server and an agent skill, and for people second,
as tables, drawings and playgrounds. Modaal measures and publishes the data.

[specs/](specs/) has three specs, and each one's "Phasing" section lists the commits that build
the site. The dataset is in `data/` (spec 001 phase 3) and the pages in `src/pages/` (phase 4); the
files for agents follow in phase 5.

| spec | what it plans |
| --- | --- |
| [001-site-and-dataset](specs/001-site-and-dataset/spec.md) | the dataset, the pages, the files for agents, the analytics, the hosting |
| [002-agent-interfaces](specs/002-agent-interfaces/spec.md) | the MCP server, Markdown by content negotiation, the skill and the Claude Code plugin |
| [003-data-rounds](specs/003-data-rounds/spec.md) | the measurement rounds that add devices and fields after launch |

## Build and run

The site needs Node 24 (`.node-version`). The repository checks need bash and python3:

```bash
bash scripts/check-agent-rules.sh     # AGENTS.md and CLAUDE.md are byte-identical
scripts/check-skills.sh               # skills, plugin manifests and spec references
scripts/check-skills.sh --self-test   # each check red against a seeded violation
npm ci
npm run check:data                    # data/devices.json against its schema and rules
npm run check                         # astro check: the pages' and the code's types
npm run build                         # the static site, into dist/
npm test                              # vitest; its site tests read dist/, so build first
npm run dev                           # the site at http://localhost:4321, rebuilt on each save
```

## Layout

| path | what |
| --- | --- |
| `AGENTS.md` | the rules an agent working in this repository follows |
| `CLAUDE.md` | a byte-identical copy of `AGENTS.md`, the file Claude Code reads |
| `specs/NNN-slug/spec.md` | the plan behind a change too big to carry in a commit message |
| `data/devices.json` | the dataset, written by an export from the measurement runs, never by hand |
| `data/schema.json`, `data/CHANGELOG.md` | its JSON Schema, and one entry per dataset version |
| `src/lib/` | the code the checks and the site share: the dataset's types, the data checks, the geometry, the table rows |
| `src/pages/`, `src/components/`, `src/layouts/`, `src/styles/` | the pages, built by Astro into `dist/`; every number on them comes from `data/devices.json` |
| `astro.config.mjs`, `tsconfig.json` | the build: one `.html` file per page, no trailing slashes |
| `scripts/check-data.ts`, `tests/` | `npm run check:data`, and the vitest files |
| `scripts/check-agent-rules.sh` | the comparison of `AGENTS.md` with `CLAUDE.md` |
| `scripts/check-skills.sh` | the checks on skills, plugin manifests and specs, with `--self-test` |
| `.github/workflows/ci.yml` | the `rules`, `skills` and `site` jobs, on every pull request and push to `main` |
| `LICENSE`, `LICENSE-DATA` | the two licenses, below |

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) covers how a change is made and checked.
Vulnerabilities go through [SECURITY.md](SECURITY.md).

## License

- **The dataset** under `data/`, and its copies the site serves under `/data/`: Creative Commons
  Attribution 4.0 International. See [LICENSE-DATA](LICENSE-DATA). Credit "screens.guide, measured
  by Modaal" with a link to https://screens.guide.
- **Everything else**, the code, the pages and the skills: MIT. See [LICENSE](LICENSE).
