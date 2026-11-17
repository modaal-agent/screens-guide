# 002 — Agent interfaces: an MCP server, Markdown by content negotiation, and a skill

**Status:** Written 2026-11-17, revised in place the same day with spec 001's answers on the domain
and analytics (spec 001 §10.3 and spec 001 §10.6) and the answers to §9.1 to §9.4. Not
implemented. **Baseline:** `main` at `77f08eb`. **Obsoletes:** nothing.

**Relates to:**

- spec 001 §2 — the dataset every interface here reads.
- spec 001 §4 — the static files for agents. This spec adds the interfaces that need a Worker
  script or an install step.
- spec 001 §5.1 — the assets-only Worker. Phase 2 here gives it a script.
- spec 001 §5.5 — the PostHog project and the pages' events. §2.5 here adds the Worker's events.
- §10 — every external reference this spec makes.

---

## 0. TL;DR

1. **Spec 001 publishes the data as static files, and an agent has to know their URLs to use
   them.** This spec adds three interfaces that put the data in an agent's tool list or context
   (§1.1).
2. **An MCP server at `https://screens.guide/mcp`**: stateless, read-only, with no sign-in, on the
   Worker that serves the site. Five tools: `list_devices`, `get_device`, `compare_devices`,
   `check_layout` and `convert_units` (§2).
3. **The Worker answers `Accept: text/markdown` with the page's Markdown copy**, so an agent that
   fetches a page URL gets the tables without the HTML (§3).
4. **A skill, `screens-guide`, in a Claude Code plugin that also connects the MCP server.** The
   repository root is the plugin marketplace, and the plugin is rooted at `skills/`. The skill holds
   the layout rules for each platform, the way to query the data, and a snapshot of the device table
   for agents without network access. Eval cases in `evals/` measure it (§4, D9).
5. **The server is listed in the official MCP Registry as `io.github.modaal-agent/screens-guide`**,
   published from GitHub Actions, and submitted to the directories that list a remote server
   (§4.4, D10).
6. **`/mcp` allows each client address 100 requests a minute and 1,000 a UTC day**, through
   Cloudflare's rate limiting binding and a Durable Object (§2.6, D11).
7. **The MCP handler is written here, with no runtime dependency.** The tests drive it with the
   official MCP SDK's client (D1).
8. **The Worker sends a PostHog event for each MCP message, each page and each data file it
   serves**, so agent use is counted beside spec 001's page views (§2.5, D8).
9. **Four phases after this spec.** The last one needs spec 001's deploy (§6). All four questions
   are answered (§9).

---

## 1. Current state (measured 2026-11-17)

### 1.1 What spec 001 gives an agent

Spec 001 §4 publishes a JSON file per device, one JSON file of all devices, a CSV, a JSON Schema,
`llms.txt`, `llms-full.txt` and a Markdown copy of every page. An agent reaches each by its URL.
Nothing lists them among the agent's tools.

### 1.2 The MCP transport, protocol revision 2025-11-25

From E1:

- A server answers a POSTed request with either `Content-Type: text/event-stream` or
  `Content-Type: application/json`, "to return one JSON object". "The client MUST support both these
  cases."
- A server that offers no stream on GET answers GET with "HTTP 405 Method Not Allowed".
- A server "MAY assign a session ID at initialization time". A server that assigns none keeps no
  session.
- The client "MUST include the `MCP-Protocol-Version: <protocol-version>` HTTP header on all
  subsequent requests". With the header missing, the server "SHOULD assume protocol version
  `2025-03-26`". With a value invalid or unsupported, the server "MUST respond with
  `400 Bad Request`".
- "Servers MUST validate the `Origin` header on all incoming connections to prevent DNS rebinding
  attacks." An Origin present and invalid gets "HTTP 403 Forbidden".

The official TypeScript SDK, `@modelcontextprotocol/sdk` 1.32.2 (published 2026-10-23, E5), sets
`LATEST_PROTOCOL_VERSION = '2025-11-25'` and `SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION,
'2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07']` in `dist/esm/types.js`. Its
`dependencies` list 17 packages, express, hono, cors and jose among them (`npm view
@modelcontextprotocol/sdk@1.32.2 dependencies`).

### 1.3 Cloudflare Workers

From E2:

- `run_worker_first` takes `true`, `false` (the default) or an array of route patterns. A pattern
  starting with `!` excludes a route, and excluding patterns take precedence. An array holds at most
  100 entries.
- Without `run_worker_first`, "Cloudflare checks for a matching asset first", and calls the
  Worker's `fetch()` only when no asset matches. In the Worker, `env.ASSETS.fetch(request)` returns
  the asset response "using the configured HTML handling and missing-asset fallbacks".

From E3: Cloudflare's Markdown for Agents converts a zone's HTML to Markdown for requests that send
`Accept: text/markdown`. It is "available to Pro, Business and Enterprise plans, and SSL for SaaS
customers at no cost". The Free plan is not listed.

### 1.4 The Agent Skills format

From E4:

- `SKILL.md` starts with frontmatter. `name` and `description` are required. `license`,
  `compatibility`, `metadata` and `allowed-tools` are optional.
- `name`: 1–64 characters, lowercase letters, digits and hyphens, no leading, trailing or doubled
  hyphen, and it "Must match the parent directory name".
- `description`: 1–1024 characters.
- Optional directories: `scripts/`, `references/` and `assets/`.
- "Keep your main `SKILL.md` under 500 lines."
- The page does not say how a skill is packaged or distributed.

### 1.5 PostHog's capture API

From E7:

- `POST https://eu.i.posthog.com/i/v0/e/` takes one event. `api_key`, `event` and `distinct_id` are
  required; `properties` and `timestamp` are optional. The endpoint answers 200 to an invalid event
  too, such as one without a `distinct_id`.
- An event with `"$process_person_profile": false` in its `properties` is stored without person
  properties. Such anonymous events "can be up to 4x cheaper than identified ones", and the first
  million events a month are free.

The site's PostHog project is in the EU region (spec 001 §1.6).

### 1.6 Rate limiting on Cloudflare

From E8:

- The Workers rate limiting binding, `ratelimits` in `wrangler.jsonc`, takes `simple.limit` and
  `simple.period`, and the period "Must be either `10` or `60`". Counts "apply separately in each
  Cloudflare location" and are "eventually consistent". "If you need one strict limit across all
  locations, implement a rate limiter with Durable Objects." The page advises against an IP address
  as the key, "since these can be shared by many users", and names no plan and no price.
- WAF rate limiting rules on the Free plan: one rule, counted per IP over 10 s, with a 10 s block.
  No plan counts over 24 hours; Enterprise's longest counting period is 65,535 s.
- Durable Objects run on the Workers Free plan with the SQLite storage backend only, within 100,000
  requests and 100,000 rows written a day, reset at 00:00 UTC: "If you exceed any one of the free
  tier limits, further operations of that type will fail with an error."
- Workers KV on the Free plan takes 1,000 writes a day, and one write per key per second.
- The Workers Free plan allows an account 100,000 Worker requests a day. Requests to static assets
  are free and unlimited.

### 1.7 The MCP Registry and other directories

From E9, whose pages each say the registry "is currently in preview":

- `server.json` follows the schema
  `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`. `name`,
  `description` (1–100 characters) and `version` are required. "A server with only `remotes` does
  not need a `packages` entry"; a remote is `{ "type": "streamable-http", "url": … }`, and the
  registry "does not verify that you control the remote URL".
- An `io.github.<org>/*` name needs an Owner of the organization. "`mcp-publisher login github`
  cannot currently publish to an organization namespace." GitHub Actions can, through OIDC
  (`mcp-publisher login github-oidc`, with the `id-token: write` permission), and so can an
  organization owner's personal access token. An organization's token "can publish — and
  overwrite — any server under `io.github.<org>/*`".
- "The version string **MUST** be unique for each publication of the server", and for a remote
  server "the server version should align with the API version".

From E10, read 2026-11-17:

- The GitHub MCP Registry lists a server from the official registry after a manual onboarding,
  requested by email to partnerships@github.com.
- PulseMCP takes no submissions, and picks servers up from the official registry.
- Glama takes the official registry's servers and community submissions, and lists remote servers as
  "Connectors".
- mcp.so has a submission form with a "Remote Server" type and a free review.
- Smithery documents no submission path.

### 1.8 Claude Code plugins in other public repositories

Three public repositories ship a skill as a Claude Code plugin (E11), read 2026-11-17:

- Each keeps `.claude-plugin/marketplace.json` at the repository root, with one entry whose
  `source` is `./skills`, and `skills/.claude-plugin/plugin.json` with `name`, a semver `version`,
  `skills` (the skill's directory), `icon`, `documentationUrl`, `privacyPolicyUrl`,
  `termsOfServiceUrl` and `supportUrl`. None declares an MCP server.
- Their contributing guides say Claude Code installs a plugin update only when `version` changes,
  and raise it in every change under `skills/`.
- Each keeps its eval cases beside `skills/`, because the eval runner refuses a case directory
  inside the plugin's skill directory, and copies the plugin and the cases into one scratch
  directory for a round. No CI job runs them; each run costs model calls.
- Compaction keeps the first 5,000 tokens of each loaded skill, and `claude plugin details` prints
  a skill's token count. A line budget passed while a body was over 5,000 tokens.
- Users install with `/plugin marketplace add <owner>/<repo>` and
  `/plugin install <plugin>@<marketplace>`.

A plugin of the same kind, submitted to Anthropic's plugin directory in 2026, was refused for
carrying scripts: the directory "accepts scripts, programs, and files outside the allowed types
only from Verified organizations", and the allowed types are Markdown, text, JSON, YAML and PNG,
JPEG, GIF, WebP or ICO images (E12).

### 1.9 Not measured

- Whether `public/_headers` applies to a response the Worker script builds itself. E2 does not say.
  Phase 2 measures it with `npx wrangler dev`; until then the Worker sets its own headers.
- How each agent installs a skill from a URL: Claude Code, claude.ai, and other agents that read the
  format. Phase 4 reads each agent's documentation and writes the steps it finds.
- How many agent requests send `Accept: text/markdown`. Phase 5 counts the `accept` values of a
  week's `page_served` events (§2.5).
- The Workers request allowance on the account's plan. Phase 5 reads it in the dashboard.
- Which address and location PostHog records for an event the Worker sends. If it records the
  Worker's own address, the location properties are Cloudflare's data centre's, not the agent's.
  Phase 5 reads the first events.
- Whether the rate limiting binding runs on the account's plan, and at what price. E8 names
  neither. Phase 5 reads the dashboard and the first deploy; without the binding, the Durable
  Object of §2.6 counts the minute window too (D11).
- How Claude Code connects a plugin's HTTP MCP server: through `.mcp.json` in the plugin root or
  `mcpServers` in `plugin.json`, and whether `claude plugin validate --strict` accepts
  `"type": "http"`. Phase 4 measures both with `claude plugin validate --strict ./skills` and
  `claude plugin details`.
- Whether an eval round reaches the plugin's HTTP MCP server. The runner's `--mocks record` starts no
  plugin server that has no mock. Phase 4 runs one case each way.

---

## 2. The MCP server

### 2.1 Endpoint and transport

- `POST https://screens.guide/mcp` takes one JSON-RPC 2.0 message, or an array of them, and answers
  with one `application/json` body. The server sends no event stream and assigns no session ID (D2).
- `GET` and `DELETE` answer 405 with `Allow: POST`.
- A message with no `id` (a notification) gets 202 with no body.
- `initialize` answers with the client's `protocolVersion` when the server supports it, and with
  `2025-11-25` otherwise. The server supports `2025-11-25`, `2025-06-18`, `2025-03-26` and
  `2024-11-05`. A request whose `MCP-Protocol-Version` header names another version gets 400.
- The `initialize` result declares the `tools` capability with `listChanged: false`, `serverInfo`
  `{ "name": "screens-guide", "version": <the dataset version, spec 001 §2.4> }`, and an
  `instructions` text that names the units (pt on iOS, dp on Android) and the tools.
- Methods: `initialize`, `ping`, `tools/list` and `tools/call`. Any other method gets JSON-RPC error
  -32601, malformed JSON -32700, and invalid parameters -32602. A tool that cannot answer returns a
  result with `isError: true` and a text saying why, such as the valid device ids for an unknown id.
- `Origin`: a request without the header is served, and so is one from `https://screens.guide`.
  Any other origin gets 403 (D3).
- A body over 64 KiB gets 413. `check_layout` takes at most 200 frames.
- A request over the rate limit of §2.6 gets 429.

### 2.2 Tools

Every tool reads the dataset of spec 001 §2, and every coordinate is in the device's unit, in
window coordinates with the origin at the window's top left. Each tool declares an `outputSchema`
and returns the result as `structuredContent` and as JSON text in `content`, for clients that read
text only. Each carries the annotations `readOnlyHint: true`, `idempotentHint: true` and
`openWorldHint: false`.

| tool | input | output |
| --- | --- | --- |
| `list_devices` | `platform` (`ios`, `android`), `kind` (`phone`, `tablet`, `foldable`); both optional | one row per device: id, name, platform, kind, unit, each screen's id and portrait window size, the runtimes it has readings on, and its `current` runtime |
| `get_device` | `id`; `screen`, `orientation` and `runtime`, optional | the device's readings from spec 001 §2.2: the `current` set, or the runtime given, narrowed to the screen and orientation when given |
| `compare_devices` | `ids`, 2–8 device ids; `orientation` and `runtime`, optional | one row per device and screen, from each device's `current` readings unless `runtime` is given: window size, pixels, scale, safe-area insets, the safe area's rectangle, corner radii |
| `check_layout` | `device`, `screen`, `runtime` (both optional), `orientation`, and `frames`: a list of `{ name, x, y, width, height, cornerRadius? }` | per frame, the findings of §2.3 with their numbers, and the concentric radius for a frame near a rounded corner |
| `convert_units` | `device`, `values`, `from` and `to`, each `pt`, `dp` or `px` | the converted values, and for Android the pixel value Compose's `Dp.roundToPx()` gives (rounded to the nearest pixel) |

### 2.3 What `check_layout` reports

For each frame, every finding that applies:

| finding | when | numbers |
| --- | --- | --- |
| `outside-window` | part of the frame lies outside the window | the overhang per edge |
| `in-inset` | the frame overlaps the top, bottom, left or right inset | the edge and the overlap depth |
| `cut-by-corner` | a frame corner lies outside the display's corner curve | the corner and the depth: the distance from the curve's centre minus the radius |
| `near-corner` | a frame corner lies within the display radius of both edges at a corner, and inside the curve | the gap to the curve, and the concentric radius: the display radius minus the frame's margin |
| `under-system-bar` | the frame overlaps the status bar, the navigation bar or the tab bar the dataset records | the bar and the overlap depth |
| `crosses-fold` | the frame crosses the fold's band | whether the fold separates the halves in this screen |
| `in-occlusion-region` | the frame overlaps a region the dataset records, such as the iPhone Duo's camera | the region's kind and whether the system reports it active |

The corner arithmetic is the docs article's (E6): on the iPhone 17, radius 62 pt, a square corner
16 pt from the side and 34 pt from the bottom edge lies 8.15 pt inside the curve; at 16 pt from
both edges it is cut off by 3.05 pt. Both are test cases (§5).

### 2.4 Shared code

`src/lib/geometry.ts` holds the arithmetic of §2.3. Spec 001's phase 6 writes it with the corner
fit and pixel snapping its playgrounds use (spec 001 §3.4); phase 2 here adds the findings only
`check_layout` reports: `outside-window`, `in-inset`, `under-system-bar`, `crosses-fold` and
`in-occlusion-region`. `check_layout` and the playgrounds import the one file, and one test file
covers it.

### 2.5 Usage events

`worker/analytics.ts` sends one PostHog event per request the Worker serves, to the project of
spec 001 §5.5, with the token and host from `src/lib/analytics.ts`:

| event | when | properties |
| --- | --- | --- |
| `mcp_request` | each JSON-RPC message to `/mcp`, and each request the rate limit refuses | `method`; for `initialize`, the `clientInfo` name and version and the `protocolVersion`; for `tools/call`, the `tool`, the device ids, `screen`, `orientation` and `runtime` it names, the number of frames for `check_layout`, and `isError`; the error code of a JSON-RPC error; `rate_limited`, `minute` or `day`, for a refused request; the HTTP status |
| `page_served` | a page route of spec 001 §3.1 | `path`; `format`, `html` or `markdown` (§3); the HTTP status |
| `file_served` | a data file of spec 001 §4.1, `llms.txt`, `llms-full.txt`, a `.md` copy fetched by its own URL, or a file of the skill (§4.2) | `path`; the HTTP status |

- Every event also carries the request's `User-Agent` and `Accept` headers, which tell an agent's
  HTTP client from a browser.
- `/privacy` (spec 001 §3.1) lists each event, and the rate limit's count (§2.6), in the pull
  request that adds it.
- Each event has a new random UUID as `distinct_id` and `"$process_person_profile": false`, so
  PostHog stores it as an anonymous event (§1.5). A stateless server cannot tell two requests from
  one client apart (D2).
- No event carries the client's address, the `check_layout` frames or any text a client sent.
- The Worker sends the event with `ctx.waitUntil` after the response is built, so the response does
  not wait for PostHog, and a failed send is logged and changes no response.
- Events are sent only when the request's host is `screens.guide`; tests and `npx wrangler dev`
  send none.
- `page_served` counts browsers too, beside spec 001's `$pageview`. A browser's `User-Agent` and
  its `$pageview` tell the two apart.

### 2.6 Rate limit

- Each client address, read from the `CF-Connecting-IP` header, may send `/mcp` 100 requests a
  minute and 1,000 a UTC day. Pages and files carry no limit.
- **The minute window** is a rate limiting binding, `MCP_MINUTE`, with
  `simple: { limit: 100, period: 60 }`, keyed on the address. Cloudflare counts it in each location
  separately, and approximately (§1.6).
- **The day window** is a SQLite-backed Durable Object class, `DailyCount`, one object per address.
  The object's name is the SHA-256 of the address, so no address is stored. It holds one row, the
  UTC date and the count, and a request on a new date replaces the row. A request costs one Durable
  Object request and one row written.
- The Worker checks the `Origin` (§2.1), then the minute window, then the day window, and parses the
  body last. A request the minute window refuses never reaches the Durable Object.
- A refused request gets HTTP 429 with `Retry-After`, the seconds to the window's end, and a
  JSON-RPC error, code -32000, whose message names the limit and when it resets.
- `wrangler.jsonc` gains `ratelimits`, `durable_objects`, and a `migrations` entry with
  `new_sqlite_classes: ["DailyCount"]`.

---

## 3. Markdown by content negotiation

- `run_worker_first` in `wrangler.jsonc` lists the page routes of spec 001 §3.1, `/mcp`, and the
  files §2.5 counts: `/data/*`, `/llms.txt`, `/llms-full.txt`, the `.md` copies and `/skills/*`
  (D8). A test reads the built files in `dist/` and fails when a page route or a counted file is
  missing from the list, so a new page cannot skip negotiation or counting. `/_astro/*`, images and
  `robots.txt` stay asset-first. The Worker serves a counted file from `env.ASSETS` unchanged.
- When `Accept` names `text/markdown` with a quality at least that of `text/html`, or names
  `text/markdown` and not `text/html`, the Worker returns the page's `.md` copy from
  `env.ASSETS` (`/index.md` for `/`) with `Content-Type: text/markdown; charset=utf-8`.
- Every negotiated response carries `Vary: Accept`. An HTML response also carries
  `Link: </devices/iphone-17.md>; rel="alternate"; type="text/markdown"`, with the page's own path.
- The `.md` copies are the ones spec 001 §4.2 writes from the dataset, not a conversion of the HTML
  (D4).

---

## 4. The skill

### 4.1 Contents

```
.claude-plugin/marketplace.json            the marketplace: one entry, screens-guide, source ./skills
skills/                                    the plugin root: Markdown, JSON and the icon only
  .claude-plugin/plugin.json               name, version, skills, icon and the listing URLs
  .claude-plugin/icon.png                  1024 × 1024, opaque
  .mcp.json                                the MCP server, https://screens.guide/mcp, type http (§1.9)
  screens-guide/SKILL.md                   the rules and how to query the data
  screens-guide/references/devices.md      one table per platform, with the dataset version and date
evals/<case>/prompt.md, graders/*.md       the eval cases, outside the plugin root (§4.3)
server.json                                the MCP Registry entry (§4.4)
```

- `marketplace.json`: `name` `screens-guide`, `owner` `modaal-agent`, and one plugin entry,
  `screens-guide`, with `source` `./skills` and `category` `development`.
- `plugin.json`: `name` `screens-guide`, `version` `1.0.0` at the first release, `skills`
  `./screens-guide`, `license` `MIT`, `author` Modaal.dev, `homepage` https://screens.guide, the
  repository's URL, `icon`, `documentationUrl` https://screens.guide/agents, `privacyPolicyUrl`
  https://screens.guide/privacy, `termsOfServiceUrl` https://modaal.dev/terms, and `supportUrl`
  the repository's issues page.
- `SKILL.md` frontmatter: `name: screens-guide`, a `description` that names the triggers (laying
  out, reviewing or testing a mobile screen; safe areas, corner radii, system bars, pt, dp and px,
  foldables), and `license: MIT`.
- The body, under the line and token budgets in `AGENTS.md`:
  - how to read the data: the MCP tools of §2.2 when the server is connected, else the URLs of
    spec 001 §4.1, else `references/devices.md`;
  - the rules the measurements support, per platform, each with its numbers and the device and
    runtime they were read on: the concentric radius, the iOS tab bar's fixed gap from the bottom
    edge, the status bar hidden in landscape on iPhone, Android's fractional dp and its 80 dp
    navigation bar above the bottom inset, the window size class thresholds, the fold band;
  - a checklist for reviewing a screen against a device, which names `check_layout`.
- `references/devices.md` is written by `npm run gen:skill` from `data/devices.json` and committed:
  the plugin and `npx skills` read the repository, not the build. `npm test` fails when the
  committed file differs from the generator's output. A dataset change that changes the file raises
  the plugin's patch version in the same commit.
- No `scripts/`: the skill runs no code (D5), and the plugin root holds nothing but Markdown, JSON
  and the icon (D9).

### 4.2 Distribution

| channel | how a user installs it | what it installs |
| --- | --- | --- |
| Claude Code plugin | `/plugin marketplace add modaal-agent/screens-guide`, then `/plugin install screens-guide@screens-guide` | the skill, and the MCP server |
| the cross-agent CLI | `npx skills add modaal-agent/screens-guide` | the skill |
| claude.ai and the Skills API | upload `https://screens.guide/skills/screens-guide.zip` | the skill |
| the MCP server alone | `claude mcp add --transport http screens-guide https://screens.guide/mcp`, or the URL in any client | the tools |

- The build writes `dist/skills/screens-guide.zip` and the skill's files under
  `dist/skills/screens-guide/`, from `skills/screens-guide/`.
- A user updates the plugin with `/plugin marketplace update screens-guide`, then
  `/plugin update screens-guide@screens-guide`. Claude Code installs the update only when
  `version` changed (§1.8).
- `/agents` (spec 001 §3.1) gives each channel's steps, and the steps for each other agent phase 4
  reads about (§1.9).
- `references/devices.md` states the dataset version and date. `SKILL.md` tells the agent to prefer
  the MCP server or the URLs, and to treat the snapshot as the data of that date.
- After phase 5, the user submits the plugin to Anthropic's plugin directory with `skills` as the
  plugin path.

### 4.3 Eval cases

- Each case is `evals/<case>/prompt.md` with its graders in `evals/<case>/graders/`, the format
  `claude plugin eval` reads. A round copies `skills/.` and `evals/` into one scratch directory and
  runs `--ablation with-without`, as CONTRIBUTING.md describes; `evals/results/` is ignored by git.
- Three kinds, at least two cases of each:
  - **trigger**: a prompt that should invoke the skill, such as laying out a bottom toolbar for the
    iPhone 17 in SwiftUI, and one that should not, such as renaming a Kotlin function; graded by
    `tool_used` on `Skill`;
  - **data**: a question answered by a number in `references/devices.md`, such as the Pixel 8's
    status bar height in dp; graded by a `regex` on the number;
  - **review**: a screen's frames given in the prompt, against one device; graded by `llm` on the
    findings of §2.3 with their numbers, such as a corner cut off by 3.05 pt.
- No CI job runs the cases (D12). A pull request that changes the skill's description or body
  quotes its round's scores and cost in the commit message.

### 4.4 The MCP Registry and other directories

- `server.json` at the repository root: `$schema` the 2025-12-11 schema (§1.7), `name`
  `io.github.modaal-agent/screens-guide`, `title` `screens.guide`, `description` "Measured screen
  sizes, safe areas, corner radii and system bars of iOS and Android devices." (91 characters),
  `version` the version of the MCP interface (D10), `websiteUrl` https://screens.guide,
  `repository` the GitHub repository, and one remote, `streamable-http` at
  `https://screens.guide/mcp`.
- `.github/workflows/mcp-registry.yml` publishes it on a tag `mcp-v<version>`. It installs
  `mcp-publisher` at a pinned release and verifies the archive's signature with `cosign`, as E9's
  example does; fails when the tag's version differs from `server.json`'s; logs in with
  `mcp-publisher login github-oidc`; and runs `mcp-publisher publish`.
- The job runs in a GitHub environment, `mcp-registry`, with a required reviewer: the
  organization's OIDC grant covers every server under `io.github.modaal-agent/*` (§1.7).
- After the first publish, the user requests the GitHub MCP Registry's onboarding by email, submits
  the server to Glama and to mcp.so's free review as a remote server, and leaves PulseMCP to pick it
  up from the official registry. Smithery is skipped (§1.7).

---

## 5. Checks

Run in CI on every pull request, beside spec 001 §6:

- **Protocol unit tests** (vitest): `initialize` with each supported version and with an
  unsupported one; the 400 for an unsupported `MCP-Protocol-Version`; the 403 for a foreign
  `Origin`; 405 for GET; 202 for a notification; -32601, -32700 and -32602; 413; an array of
  messages.
- **Tool tests**: each tool on the dataset, with its output checked against its `outputSchema`;
  the corner cases of §2.3 (8.15 pt inside, 3.05 pt cut off, concentric radius 46 pt on the
  iPhone 17 with a 16 pt margin).
- **Conformance**: the test starts `npx wrangler dev`, connects with the SDK's `Client` and
  `StreamableHTTPClientTransport` (E5, a dev dependency), lists the tools and calls each one.
- **Negotiation**: `curl -H 'Accept: text/markdown'` on each page route returns its `.md` copy;
  `Accept: text/html` returns HTML with the `Link` header.
- **The skill and the plugin**: `scripts/check-skills.sh` runs S1 to S11, which already hold the
  frontmatter, the budgets, the links and the manifests. Phase 4 adds:
  - S17: every eval case parses, with its frontmatter keys among the runner's and each grader of a
    known type;
  - S18: the plugin root holds Markdown, JSON and PNG files only, none starting with `#!`;
  - S19: a change under `skills/` raises `version`. It reads git history, so the `skills` job checks
    out with `fetch-depth: 0`;
  - S20: `server.json` parses, its `name` is `io.github.modaal-agent/screens-guide`, its
    `description` is at most 100 characters, and its one remote is `https://screens.guide/mcp`.
- **By hand, before a push that changes a manifest**: `claude plugin validate --strict .` and
  `claude plugin validate --strict ./skills`, quoted in the commit message.
- **Rate limit**: with the binding and the Durable Object stubbed, the 101st request in a minute
  from one address gets 429 with `Retry-After`; the 1,001st in a UTC day gets 429; another address
  is served; a request the minute window refuses writes no row; the first request on a new date is
  served. `npx wrangler dev` runs the Durable Object once with a limit lowered by a variable.
- **Usage events**: with `fetch` to PostHog stubbed, each event of §2.5 is sent once with its
  properties for a request to `screens.guide` and not at all for one to `localhost`; no event
  carries a `check_layout` frame; a PostHog answer of 500 or a network error leaves the response
  unchanged.

Live, in phase 5: the `claude mcp add` command of §4.2, then a session that lists the tools and calls
`get_device` for `iphone-17`; that session's `mcp_request` events, and a `page_served` and a
`file_served` event from `curl`, arrive in the PostHog project. The plugin installs from
`modaal-agent/screens-guide` and lists the skill and the server in `claude plugin details`. The
first `mcp-v` tag publishes `server.json`, and the registry's API returns it.

---

## 6. Phasing

| phase | what lands | why here |
| --- | --- | --- |
| 1 | `specs/002-agent-interfaces/spec.md` | the spec opens the series |
| 2 | `worker/index.ts`, `worker/mcp.ts` and `worker/analytics.ts` with the `mcp_request` event, the rate limit of §2.6, the findings of §2.4 added to `src/lib/geometry.ts`, the `mcp_request` event and the rate limit's count on `/privacy`, the tests of §5, `main`, `run_worker_first`, `ratelimits`, `durable_objects` and `migrations` in `wrangler.jsonc`, the MCP section of `/agents` | needs spec 001's dataset (its phase 3) and pages (its phase 4) |
| 3 | Markdown negotiation in `worker/index.ts`, the `page_served` and `file_served` events with their `run_worker_first` entries and their lines on `/privacy`, and their tests | uses phase 2's Worker script |
| 4 | the skill, `references/devices.md` and its generator, the two plugin manifests, the icon and `.mcp.json`, the eval cases and a first round, S17 to S20, the zip, the install steps on `/agents` | the skill names phase 2's tools |
| 5 | deploy, the live checks of §5, Workers logs on, `server.json` and `mcp-registry.yml` with the first publish; then the user's steps: the `mcp-registry` environment and its reviewer, the directory submissions of §4.4, and the plugin directory submission | needs spec 001's deploy phase |

Commit subjects carry the prefix `[002-agent-interfaces]`.

### 6.1 What each phase landed

| phase | landed | departures from the plan |
| --- | --- | --- |
| 1 | `52aa47d`, with specs 001 and 003 | — |

---

## 7. Decisions

**D1 — The MCP handler is written here, with no runtime dependency.** Three options:

- The SDK's `McpServer` with a transport. It tracks protocol revisions for us. It brings 17 runtime
  dependencies into the tree (§1.2), and the Worker bundle has to tree-shake the Node HTTP code out.
- Cloudflare's `agents` package. It wraps the SDK and adds Durable Objects for sessions, which a
  stateless server does not use.
- A handler of about four methods (§2.1) in `worker/mcp.ts`. It adds no dependency. The cost is
  following each new protocol revision by hand. The conformance test (§5) runs the SDK's own client
  against it, so a revision the SDK adopts and the handler lacks fails CI after an SDK update.

The plan takes the third.

**D2 — Stateless, with JSON responses.** The tools answer from data in memory, so a response needs
no stream and no progress notification. A session would need storage, a Durable Object, for no
gain. The cost: the server cannot send messages of its own, such as a list-changed notification.
The tool list changes only on deploy.

**D3 — Requests without `Origin` and from the site's own origin are served; other origins get
403.** E1 requires validating `Origin`. Agents' HTTP clients send none. A browser page on another
site gets 403, which keeps another site's script from using the endpoint from a visitor's browser.
The cost: a browser-based MCP client on another origin cannot connect directly.

**D4 — The Worker negotiates Markdown itself.** Cloudflare's Markdown for Agents converts the HTML
generically and needs a Pro plan or above (§1.3). The `.md` copies of spec 001 §4.2 are written
from the dataset, so their tables carry the dataset's numbers as they are. The cost: every page
request on the listed routes runs the Worker, which counts against the plan's request allowance
(§1.9).

**D5 — The skill carries a snapshot of the data and runs no script.** An agent whose sandbox blocks
the network can still read `references/devices.md`. The cost: the snapshot is as old as the last
install, so it states its date and version (§4.2). A script would need the agent's permission to
run, and the data needs none.

**D6 — Five tools, and no resources or prompts.** The device list, 22 devices at launch (spec 001
§1.2), fits in one `list_devices` response, so there is no search tool. Clients support tools
more widely than resources. The cost: a client that only browses resources sees nothing.

**D7 — No authentication.** The data is public and the tools only read. §2.6 limits each client
address instead (D11).

**D8 — The Worker counts the files agents fetch, and every page it serves.** An agent that reads
the site without MCP fetches the data files, `llms.txt`, a page or its `.md` copy, and runs no
JavaScript, so `posthog-js` on the pages (spec 001 §5.5) never sees it. Serving those files
asset-first would leave them to Cloudflare's own request counts, outside PostHog. Listing them in
`run_worker_first` (§3) runs the Worker for each, and the Worker sends the event of §2.5. The cost:
one Worker request per counted file, where an asset request runs no Worker, against the plan's
allowance (§1.9); and the Worker's own headers on those responses until §1.9's `_headers` question
is measured. `/_astro/*` and images stay asset-first: pages load them, and `$pageview` already counts
the page.

**D9 — The repository is the plugin marketplace, and one plugin, rooted at `skills/`, carries the
skill and connects the MCP server.** One install gives an agent both the rules and the tools. The
layout is the one the three repositories of §1.8 use: with the plugin rooted at `./`, every user's
plugin cache would hold the whole repository, pages and Worker included. The plugin root holds only
Markdown, JSON and the icon, which Anthropic's plugin directory accepts from any organization (§1.8).
The costs: every change under `skills/` raises the plugin's version, a dataset change included, since
it regenerates `references/devices.md`; and a user of a third-party marketplace updates by hand.
Decided by the user on 2026-11-17 (§9.1).

**D10 — The official MCP Registry lists the server as `io.github.modaal-agent/screens-guide`,
published from GitHub Actions in a protected environment.** The user chose the `modaal-agent`
namespace on 2026-11-17 (§9.2). The interactive `mcp-publisher login github` cannot publish to an
organization's namespace (§1.7); OIDC from Actions can, and needs no stored secret. An organization
owner's token was the alternative: a long-lived secret that can overwrite any `modaal-agent` server.
The environment's reviewer holds the same risk for OIDC. `server.json`'s `version` is the MCP
interface's version, raised when a tool or its schema changes, and the dataset version stays in
`serverInfo` (§2.1): a data round would otherwise publish a registry version per round. Other
directories read the official registry or take a form (§1.7), so this repository holds no file for
them.

**D11 — The minute window is Cloudflare's rate limiting binding, and the day window a Durable
Object per address, counted per UTC day.** The user set the limits on 2026-11-17: 100 requests a
minute and 1,000 a day (§9.3). No WAF rule on any plan counts over a day, and the Free plan's rule
counts over 10 s only. Workers KV takes 1,000 writes a day on the Free plan, so it cannot count
1,000 requests per address (§1.6). The binding costs no Durable Object request, so the minute
window costs nothing beyond the Worker request; the Durable Object counts both windows if the
binding is not available on the plan (§1.9). The costs:

- The minute limit is approximate, and counted in each Cloudflare location separately.
- A fixed UTC day lets one address send up to 2,000 requests across midnight. A rolling 24 hours
  would need a row per hour and more rows read per request.
- The Free plan's Durable Object allowance, 100,000 requests and rows written a day, caps `/mcp` at
  100,000 counted requests a day for all clients together, the same as the account's Worker
  allowance.
- Clients behind one shared address, such as an office network or a mobile carrier, share one
  allowance.

**D12 — Eval cases are run by hand, not in CI.** Each run costs model calls, and GitHub passes no
secret to a workflow that a fork's pull request starts. The cost: a change to the skill can land
without a round, so the rule in `AGENTS.md` asks for the scores in the commit message, and review
holds it.

---

## 8. Non-goals

- Tools that write, accounts, and state per user.
- A client library on npm or PyPI.
- Event streams, sampling and elicitation.
- Telling two requests from one agent apart: each Worker event has a new random id (§2.5).
- A limit per user or per key: there are no accounts (D7).
- A listing on Smithery, which documents no submission path (§1.7).

---

## 9. Open questions

**9.1 — Publish a Claude Code plugin marketplace file in the repository?** It would let a user add
the skill and the MCP server with one `/plugin marketplace add modaal-agent/screens-guide` (spec 001
§10.1). Needs an answer before phase 4.

*Answered 2026-11-17:* yes, laid out as the user's other public repositories that ship a skill as a
plugin lay theirs out (§1.8). The plugin carries the skill and connects the MCP server (§4.1, D9).

**9.2 — List the server in the MCP Registry and other directories?** A listing needs a namespace,
which comes from the GitHub owner, `modaal-agent` (spec 001 §10.1), or from the domain
`screens.guide`, registered 2026-11-17 (spec 001 §10.3). Needs an answer before phase 5.

*Answered 2026-11-17:* yes, in the official MCP Registry and the directories that take a remote
server, under the namespace `modaal-agent`: `io.github.modaal-agent/screens-guide` (§4.4, D10).

**9.3 — Rate-limit `/mcp`?** A Cloudflare rate-limiting rule per client address would cap abuse. The
right limit depends on traffic that does not exist yet. Needs an answer before phase 5.

*Answered 2026-11-17:* yes: 100 requests a minute and 1,000 a day per client address (§2.6, D11).

**9.4 — The skill's name.** `screens-guide` follows the domain, `screens.guide`, which is final
(spec 001 §10.3, D1). Needs an answer before phase 4.

*Answered 2026-11-17:* `screens-guide`.

---

## 10. External references

| id | reference | public | URL and pin | cited in |
| --- | --- | --- | --- | --- |
| E1 | Model Context Protocol specification, revision 2025-11-25, "Transports" | yes | https://modelcontextprotocol.io/specification/2025-11-25/basic/transports; revision 2025-11-25, read 2026-11-17 | §1.2, §2.1, D3 |
| E2 | Cloudflare Workers docs, static assets: "Binding" and "Worker script" routing | yes | https://developers.cloudflare.com/workers/static-assets/binding/, https://developers.cloudflare.com/workers/static-assets/routing/worker-script/; unversioned, read 2026-11-17 | §1.3, §1.9 |
| E3 | Cloudflare docs, "Markdown for Agents" | yes | https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/; unversioned, read 2026-11-17 | §1.3, D4 |
| E4 | Agent Skills specification | yes | https://agentskills.io/specification; unversioned, read 2026-11-17 | §1.4, §5 |
| E5 | `@modelcontextprotocol/sdk` on npm | yes | https://www.npmjs.com/package/@modelcontextprotocol/sdk; 1.32.2 | §1.2, §5, D1 |
| E6 | "iOS and Android Screen Sizes, Safe Areas and Corner Radii", Modaal docs | yes | https://docs.modaal.dev/articles/screen-design-constraints; source `articles/screen-design-constraints.mdx` in https://github.com/modaaldev/docs at `007c96c` | §2.3 |
| E7 | PostHog docs, "Capture API" and "Anonymous vs identified events" | yes | https://posthog.com/docs/api/capture, https://posthog.com/docs/data/anonymous-vs-identified-events; unversioned, read 2026-11-17 | §1.5, §2.5 |
| E8 | Cloudflare docs: the rate limiting binding; WAF rate limiting rules; Durable Objects pricing; Workers KV limits; Workers limits and pricing | yes | https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ (updated 2026-11-12), https://developers.cloudflare.com/waf/rate-limiting-rules/ (updated 2026-08-25), https://developers.cloudflare.com/durable-objects/platform/pricing/ (updated 2026-11-13), https://developers.cloudflare.com/kv/platform/limits/, https://developers.cloudflare.com/workers/platform/limits/, https://developers.cloudflare.com/workers/platform/pricing/; read 2026-11-17 | §1.6, D11 |
| E9 | MCP Registry docs: quickstart, remote servers, authentication, GitHub Actions, versioning; the `server.json` schema | yes | https://modelcontextprotocol.io/registry/quickstart and the pages beside it, matching `docs/modelcontextprotocol-io/` in https://github.com/modelcontextprotocol/registry at `115f852`; https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json; read 2026-11-17 | §1.7, §4.4, D10 |
| E10 | MCP directories: the GitHub MCP Registry's post and discussion, PulseMCP, Glama, mcp.so, Smithery | yes | https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/, https://github.com/github/github-mcp-server/discussions/1257, https://www.pulsemcp.com/submit, https://glama.ai/mcp/reference, https://glama.ai/mcp/connectors, https://mcp.so/submit, https://smithery.ai/future; read 2026-11-17 | §1.7 |
| E11 | Public repositories that ship a skill as a Claude Code plugin: their manifests, contributing guides, eval cases and specs | yes | https://github.com/modaal-agent/duet, https://github.com/modaal-agent/kotlin-ksp-mocks, https://github.com/modaal-agent/swift-sourcery-templates; `main` as read 2026-11-17 | §1.8 |
| E12 | *Redacted:* the record of a 2026 submission of a plugin to Anthropic's plugin directory, with the directory's refusal text; read 2026-11-17 | no | — | §1.8 |
