# screens-guide

[![CI](https://github.com/modaal-agent/screens-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/modaal-agent/screens-guide/actions/workflows/ci.yml)

The source of [screens.guide](https://screens.guide): the screen sizes, safe-area insets, corner
radii, system bars and margins of iPhones, iPads and Android devices, as measured on Xcode
simulators and Android emulators. The site publishes them for coding agents first, as JSON, CSV, a
JSON Schema, `llms.txt`, Markdown copies, an MCP server and an agent skill, and for people second,
as tables, drawings and playgrounds. Modaal measures and publishes the data.

The repository holds the plan today: [specs/](specs/) has three specs, and each one's "Phasing"
section lists the commits that build it. Spec 001 phase 2, this file set, is the first.

| spec | what it plans |
| --- | --- |
| [001-site-and-dataset](specs/001-site-and-dataset/spec.md) | the dataset, the pages, the files for agents, the analytics, the hosting |
| [002-agent-interfaces](specs/002-agent-interfaces/spec.md) | the MCP server, Markdown by content negotiation, the skill and the Claude Code plugin |
| [003-data-rounds](specs/003-data-rounds/spec.md) | the measurement rounds that add devices and fields after launch |

## Build and run

Spec 001 phase 3 adds `package.json`, and phase 4 the build. The checks that run today need bash
and python3:

```bash
bash scripts/check-agent-rules.sh     # AGENTS.md and CLAUDE.md are byte-identical
scripts/check-skills.sh               # skills, plugin manifests and spec references
scripts/check-skills.sh --self-test   # each check red against a seeded violation
```

## Layout

| path | what |
| --- | --- |
| `AGENTS.md` | the rules an agent working in this repository follows |
| `CLAUDE.md` | a byte-identical copy of `AGENTS.md`, the file Claude Code reads |
| `specs/NNN-slug/spec.md` | the plan behind a change too big to carry in a commit message |
| `scripts/check-agent-rules.sh` | the comparison of `AGENTS.md` with `CLAUDE.md` |
| `scripts/check-skills.sh` | the checks on skills, plugin manifests and specs, with `--self-test` |
| `.github/workflows/ci.yml` | the `rules` job and the `skills` job, on every pull request and push to `main` |
| `LICENSE`, `LICENSE-DATA` | the two licenses, below |

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) covers how a change is made and checked.
Vulnerabilities go through [SECURITY.md](SECURITY.md).

## License

- **The dataset** under `data/`, and its copies the site serves under `/data/`: Creative Commons
  Attribution 4.0 International. See [LICENSE-DATA](LICENSE-DATA). Credit "screens.guide, measured
  by Modaal" with a link to https://screens.guide.
- **Everything else**, the code, the pages and the skills: MIT. See [LICENSE](LICENSE).
