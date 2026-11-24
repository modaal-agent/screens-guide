# Eval cases for the screens-guide skill

Each case is a prompt a user gives a coding agent, with graders that score the answer. A round runs
every case twice, with the plugin loaded and without it, and the difference is the measure of what
`skills/screens-guide/SKILL.md` changes. A with-arm answer that is wrong is a defect in the skill's
text: edit the skill and run that case again.

| case | kind | the prompt asks | correct |
| --- | --- | --- | --- |
| `trigger-swiftui-bottom-toolbar` | trigger | a bottom toolbar for the iPhone 17 in SwiftUI | the skill fires; the buttons above the 34 pt bottom inset, the background to the edge |
| `trigger-compose-navigation-bar` | trigger | a Compose bottom bar over the Pixel 8's gesture handle | the skill fires; the bar's items above the inset, 80 dp of bar above 24 dp |
| `no-trigger-kotlin-rename` | trigger | renaming a Kotlin function | the skill does not fire; both names changed |
| `no-trigger-swift-codable` | trigger | a Swift `Codable` struct for a JSON object | the skill does not fire; `created_at` mapped |
| `data-pixel-8-status-bar` | data | the Pixel 8's status bar height in dp | 50.29 dp |
| `data-iphone-17-corner-radius` | data | the iPhone 17's corner radius, and a card's for a 16 pt margin | 62 pt and 46 pt |
| `review-iphone-17-card` | review | three frames on the iPhone 17 in portrait | the card's square corners cut off by 3.05 pt, and 18 pt into the 34 pt bottom inset |
| `review-pixel-fold-half-open` | review | three frames on the Pixel Fold, half open in landscape | the list and the button cross the fold at x 420.57 dp |
| `data-iphone-duo-half-open-hinge` | data, `web` | the iPhone Duo's hinge band, its margins and the camera region, half open | the band at y 455.5 to 495.5 pt with 20 pt either side; the camera region 134 × 82 pt at x 535 |
| `data-iphone-16-tab-bar-by-ios-version` | data, `web` | the iPhone 16's tab bar frame on iOS 18.6 and on iOS 27.2 | 393 × 83 pt at y 769 on 18.6; a 274 × 62 pt capsule at x 59.67, y 769 on 27.2 |
| `data-pixel-8-insets-by-rotation` | data, `web` | the Pixel 8's cutout and system-bar insets at each rotation | the 50.29 dp cutout on the top, left, bottom and right edges; 28.19 dp at the top when turned |
| `review-iphone-17-landscape-tab-bar` | review, `web` | three frames on the iPhone 17 in landscape, under the tab bar | the bar and the list under the 259.33 × 44 pt capsule at x 307.33; the detail 62 pt into the right inset |

## Running them

The plugin root is `skills/`, and the runner reads eval cases only below the plugin it runs, so a
round copies the plugin and `evals/` into one scratch directory. From the repository root:

```bash
run=$(mktemp -d) && cp -R skills/. "$run" && cp -R evals "$run/evals"
claude plugin eval "$run" --ablation with-without --runs 1 --no-publish --trust-plugin \
  --output-dir "evals/results/$(date +%Y-%m-%dT%H-%M-%S)"
```

`evals/results/` is ignored by git. `--case <glob>` runs one case. No CI job runs the cases, because
each run costs model calls; quote a round's scores and cost in the commit message of the change it
measured.

The runner starts no plugin MCP server that has no mock under `evals/mocks/` (`--mocks record`, the
default), so a round without the flags below measures the skill with its own
`references/devices.md`, without the tools.

### The cases tagged `web`

The four cases tagged `web` ask for measured values that public pages give in part or not at all: a
device in beta, an older iOS version, each rotation, and the exact frame of a bar. Their `allowed_tools` give
both runs `WebSearch` and `WebFetch`, so the run without the plugin can search the web. The run with
the plugin also gets the MCP server at https://screens.guide/mcp: `references/devices.md` holds the
current build only, and `data-iphone-16-tab-bar-by-ios-version` needs iOS 18.6. Run them with:

```bash
P=mcp__plugin_screens-guide_screens-guide__
claude plugin eval "$run" --tag web --ablation with-without --runs 1 --no-publish --trust-plugin \
  --allow-real-servers --allow-tools WebSearch WebFetch ${P}list_devices ${P}get_device \
  ${P}compare_devices ${P}check_layout ${P}convert_units \
  --output-dir "evals/results/$(date +%Y-%m-%dT%H-%M-%S)"
```

`--allow-real-servers` starts the live server's client as you, outside the runner's sandbox. Each
tool call counts against the server's per-address limits and sends an `mcp_request` event
(`/privacy` lists both).

## Writing a case

One directory per case, holding `prompt.md` and `graders/`. The prompt's body is the user message.
Its frontmatter takes the keys the runner reads, among them `description`, `tags`,
`expected_outcome`, `allowed_tools` and `max_turns`. Each grader is one `graders/<name>.md`, named by
its file; its frontmatter carries `type`, one of `regex`, `llm`, `tool_used`, `tool_order`,
`file_exists` and `baseline`, and that type's keys. The body is the pattern of a `regex` grader and
the criteria of an `llm` grader. `tool_used` on `Skill` with `min: 1` and `arm: with-only` reports
whether the skill fired; with `min: 0` and `max: 0` it reports a prompt that must not fire it. Give
`min: 0` there: `claude plugin eval` in Claude Code 2.1.322 reads a missing `min` as 1, so `max: 0`
alone expects 1 to 0 calls and never passes.

`scripts/check-skills.sh` S17 parses every case against those keys and types. It does not run them.
