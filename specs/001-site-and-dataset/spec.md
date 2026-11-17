# 001 — The site and the dataset

**Status:** Written 2026-11-17, revised in place the same day with the answers to §10.1 to §10.8.
Phase 3 implemented (§7.1). **Baseline:** `main` at `77f08eb`, the repository files.
**Obsoletes:** nothing.

**Relates to:**

- spec 002 — the MCP server, Markdown by content negotiation and the skill, which read the
  dataset of §2.
- spec 003 — the data rounds that add readings to the dataset after launch.
- §11 — every external reference this spec makes.

---

## 0. TL;DR

1. **Modaal's simulator and emulator runs have measured 22 device models on six iOS runtimes and
   Android API 36**, and the only public copy of the numbers is one docs page with 16 devices on one
   runtime each (§1.2, §1.3).
2. **None of the five reference sites read for this spec publishes safe-area insets, corner radii,
   system bars or Android sizes, and none offers JSON, CSV or an API** (§1.4).
3. **The site, at screens.guide (registered 2026-11-17, §1.5), publishes every recorded reading
   as a dataset first and as pages second** (D1, D3). Agents get JSON, CSV, a JSON Schema,
   `llms.txt` and a Markdown copy of every page (§4). Spec 002 adds an MCP server and a skill.
4. **The dataset holds one reading per device, OS runtime, screen and orientation**, with named
   keys and its source on each reading. A value no run measured is `null` with a reason (§2, D5,
   D6).
5. **People get the same numbers as tables and drawings in the HTML**, with an explorer, a to-scale
   comparison and playgrounds on top (§3).
6. **Astro builds the site, and a Cloudflare Worker serves it**, deployed from GitHub Actions
   (§5, D9, D10).
7. **Seven phases in this repository** (§7). The user's steps: private vulnerability reporting
   now, which `SECURITY.md` names; then, for phase 7, the Cloudflare secret and variable, the
   zone's bot settings and PostHog's cookieless setting (§1.1).
8. **PostHog counts page views and the use of the interactive parts, in its EU region, with no
   cookie** (§5.5, D15). Spec 002 adds events for the requests agents make.
9. **The probes that read the devices stay private** (D8, §10.5). `/method` names the API or
   command behind each value.
10. **All eight questions are answered** (§10). The docs article stays a separate page, updated
    by hand from the newly collected data (§10.4).

---

## 1. Current state (measured 2026-11-17)

### 1.1 This repository

Created 2026-11-17. Its first commit on `main`, `77f08eb`, holds the repository files of §5.3:
phase 2, landed ahead of this spec. This spec, spec 002 and spec 003 follow it in `52aa47d`.

Pushed the same day to https://github.com/modaal-agent/screens-guide, public, with `main` as its
default branch. CI run 44176997462 passed on `52aa47d` in 13 s. Read on 2026-11-17 with `gh`:
private vulnerability reporting is off, though `SECURITY.md` sends reports there, and the
repository has no Actions secrets or variables.

### 1.2 The recorded measurements

Modaal's measurement runs (E13) read devices on Xcode simulators and Android emulators between
2026-09-29 and 2026-11-10. A probe app reads UIKit's and SwiftUI's own values on iOS; `adb`
(`wm size`, `wm density`, `dumpsys window`, `dumpsys display`) and a Compose probe read them on
Android. The runs were inventoried on 2026-11-17. Every value below is a reading; the device
catalog built from the runs also holds generic rows copied from a measured device and five iPad
split-window rows marked as estimates, which this spec leaves out (D5).

| device | runtimes with readings | orientations read |
| --- | --- | --- |
| iPhone SE (3rd generation) | iOS 18.6, 26.5, 27.0, 27.2, 27.3 beta | portrait on each; landscape on 18.6, 27.0, 27.2 |
| iPhone 16e | iOS 18.6, 27.0 | portrait; landscape on 27.0 |
| iPhone 16 | iOS 18.6, 26.5, 27.0, 27.2, 27.3 beta | portrait on each; landscape on 18.6, 27.0, 27.2 |
| iPhone 16 Pro Max | iOS 18.6 | portrait |
| iPhone 17 | iOS 27.0, 27.2, 27.3 beta | portrait on each; landscape on 27.0 |
| iPhone 17 Pro | iOS 27.0 | portrait |
| iPhone 17 Pro Max | iOS 26.5, 27.0 | portrait on each; landscape on 26.5 |
| iPhone 17e | iOS 27.2, 27.3 beta | portrait |
| iPhone Air | iOS 27.0, 27.2, 27.3 beta | portrait on each; landscape on 27.0 |
| iPhone 18 Pro | iOS 27.2, 27.3 beta | portrait |
| iPhone 18 Pro Max | iOS 27.0, 27.2, 27.3 beta | portrait |
| iPhone Duo | iOS 27.1, 27.2, 27.3 beta | cover and inner display in each orientation; open, half open and tent poses on 27.1 |
| iPad mini (A17 Pro) | iOS 18.6, 27.0 | portrait; landscape on 27.0 |
| iPad mini (A20 Pro) | iOS 27.2, 27.3 beta | portrait |
| iPad (A16) | iOS 18.6, 27.0, 27.2, 27.3 beta | portrait; landscape on 27.0 and 27.2 |
| iPad Pro 11-inch (M5) | iOS 27.0, 27.2, 27.3 beta | portrait; landscape on 27.0 |
| iPad Pro 13-inch (M5) | iOS 27.0, 27.2, 27.3 beta | portrait; landscape on 27.0 |
| Small Android phone, 360 × 780 dp | API 36 | rotations 0 and 1 |
| Pixel 8 | API 36 | rotations 0 to 3 |
| Pixel Fold | API 36 | rotations 0 to 3, closed, half open and open |
| Pixel 9 Pro Fold | API 36 | rotations 0 to 3, closed, half open and open |
| Pixel Tablet | API 36 | rotations 0 to 3 |

The iOS runtime builds: 18.6 22G86, 26.5 23F77, 27.0 24A434, 27.1 24A94232 and 24A94425 (the iPhone
Duo only), 27.2 24B5089g, 24B8117 and 24B91016s, 27.3 24C5037i. Android: API 36, build
BE2A.250530.026.F3.

What a reading holds, by group:

- **Display:** window size in pt or dp, pixels, scale (iOS) or density (Android), per-corner display
  radius from the simulator's device profile or `dumpsys display`, and the cutout's kind.
- **Insets:** safe-area insets per orientation; on Android, the display cutout and the system bars
  apart as well as combined.
- **System bars:** the status bar's frame and placement, the inline and large-title navigation bar
  frames, the tab bar's frame (on iOS 26 and later a capsule with its corner radius), the bottom
  toolbar, the search bar; Material 3's top app bar and navigation bar on Android.
- **Margins:** the system content margins on iOS, read on 27.1 (the iPhone Duo), 27.2 and 27.3:
  16 pt on the iPhone SE (3rd generation), 16, 17, 17e and 18 Pro; 20 pt on the iPhone Air, the
  18 Pro Max, the iPads and the iPhone Duo.
- **Regions:** the occlusion regions UIKit reports (the iPhone 16's top strip 393 × 54, the
  iPad (A16)'s 32 pt strip, the iPhone Duo's camera and status block), the Android cutout's
  rectangle in pixels (the Pixel 8 `[479, 0, 601, 132]`), and the folds: bounds, the margins of the
  iPhone Duo's 40 pt division band, whether the fold separates the halves, and the hinge angle
  ranges of each posture.
- **Size classes:** UIKit's, and Android's window size classes in their V1 and V2 forms.
- **Components** (spec 003 R1): sheets, alerts, menus, list and form rows, and on Android the
  medium and large top app bars, the bottom app bar, the floating action button, the snackbar, the
  dialog and the bottom sheet.

Values that change between runtimes or builds, read from the runs:

- The inline navigation bar is 44 pt high on iOS 18.6 and 54 pt on 26.5 and later. The large-title
  bar is 96 pt on 18.6, 106 pt on 26.5 and later, and 110 pt on the iPhone Duo's tall inner window.
- On iOS 18.6 the iPad (A16) reads insets 24/25/0/0 (top, bottom, left, right) and a 50 pt inline
  bar, where 27.0 reads 32/20/0/0 and 54 pt. The iPhone 16's landscape bottom inset is 21 pt on 18.6
  and 20 pt on 27.0 and 27.2.
- On the 27.3 beta the iPhone SE (3rd generation) reads insets 16/20/0/0 and its navigation bar at
  y 16, where 27.0 reads 20/0/0/0 and y 20.
- The iPhone Duo's status block is 84 × 170 pt on build 24A94232 and 84 × 174 on 24A94425 (cover,
  portrait), and 84 × 120 or 134 × 82 against 84 × 124 or 144 × 82 on the inner display.
- An app built with the iOS 27.0 SDK runs letterboxed on the iPhone Duo: its window is 80 pt shorter
  than the display along one side.

Values that differ between two ways of reading them:

- The iPads' corner radii: the device profile gives 21.5 pt (iPad mini, A17 Pro), 25 (iPad, A16)
  and 30 (both iPad Pro). SwiftUI's `concentricCornerRadii` for a view that fills the window reads 32
  on all four on iOS 27.2 and 27.3. On iOS 18.6 a full-screen sheet's presenter corners read 25 and
  21.5, the profile's values. On the iPhones the two readings agree (§10.7).
- The device catalog rounds Android values to whole dp (Pixel 8 status bar 50). The pixel readings
  give 132 px at 420 dpi, 50.29 dp. The dataset takes the pixel readings (§2.3).

A run on 2026-09-30 read the iPhone 17 Pro in portrait and landscape, with a 402 × 54 occlusion
region, on an iOS 27.2 build it did not record. The dataset keys each reading by build (§2.2), so
the export leaves that run out; spec 003's R2 reads every iPhone in both orientations.

No run measured: keyboard heights; Display Zoom; iPad split and Stage Manager windows (the catalog's
rows for them are estimates); the corner radii of the Pixel Fold and the small phone (their
emulators report none) and of the Pixel Tablet (no reading); landscape on the devices whose table
row says portrait; Android at a font scale other than 1.

### 1.3 Where the measurements are published now

The docs page "iOS and Android Screen Sizes, Safe Areas and Corner Radii" (E1), published
2026-11-17, lists 16 of the 22 devices with one runtime each, in an explorer, tables and prose. Its
HTML and the docs site's `llms-full.txt` carry the explorer's text (`curl`, 2026-11-17). It offers
no data file.

### 1.4 The reference sites

Read 2026-11-17 (E2–E6):

| site | covers | fields | machine-readable | source stated |
| --- | --- | --- | --- | --- |
| ios-resolution.com (E2) | 144 Apple devices: 56 iPhone, 45 iPad, 7 iPod, 36 Watch, from 2007 | points, pixels, scale, PPI, diagonal, aspect ratio, release date; iPad Display Zoom | none; a page per device | no |
| iosref.com/res (E3) | iPhone, iPad, Watch, iPod; rows group devices of one size | diagonal, points, scale, pixels, aspect ratio, PPI | none on the page | no; footnotes on scaling |
| agood.com (E4) | 31 iPhone rows | body size in mm and inches | none | no |
| remobile.eu (E5) | about 30 iPhones | diagonal, body size, weight | none | "official Apple specifications" |
| wishkit.io (E6) | 44 iPhones from the 6s | diagonal, points, pixels, scale, PPI, App Store screenshot group | `llms.txt` | Apple pages, simulator profiles, App Store Connect |

- None gives safe-area insets, corner radii, status, navigation or tab bars, or any Android device.
- None offers JSON, CSV or an API.
- The sites disagree with each other. ios-resolution.com gives the iPhone Duo's inner display as
  626 × 890 points; iosref and the runs of §1.2 read 669 × 951. wishkit gives the iPhone 12 mini and
  13 mini as 360 × 780 points; ios-resolution.com and iosref give 375 × 812.

### 1.5 The domain

Read over RDAP on 2026-11-17 (E7): `screens.guide` was registered at 19:41 UTC that day with
Cloudflare, Inc. as registrar, and expires on 2027-11-17. Its nameservers are
`miguel.ns.cloudflare.com` and `rihana.ns.cloudflare.com`, so its zone is on Cloudflare. The other
names checked before the purchase are in D1.

### 1.6 Toolchain, hosting and analytics

- This Mac runs Node v20.19.5, and `nvm` is installed. `astro` 7.4.12 requires Node `>=22.23.4`
  (`npm view astro@7.4.12 engines.node`).
- The newest versions published by 2026-11-10, a week before this spec (E9): `astro` 7.4.8,
  `@astrojs/preact` 6.1.2, `preact` 11.2.0, `wrangler` 4.159.0, `vitest` 5.1.0, `posthog-js`
  1.447.10.
- The site's PostHog project is in PostHog's EU region: its token gets 200 from
  `POST https://eu.i.posthog.com/flags?v=2` and 401 from the same request to `us.i.posthog.com`
  (2026-11-17).
- From PostHog's JavaScript configuration page (E16): `cookieless_mode` takes `always` or
  `on_reject`. In cookieless mode "PostHog sets no cookies and uses no session or local storage",
  and a hash computed on PostHog's servers stands in for the visitor's id. "Cookieless mode must also
  be enabled in your PostHog project settings, otherwise cookieless events are ignored." The page
  marks `always` "(no cookie banner needed)".
- Another site of the user's is built the way §5 describes: Astro to static HTML, an assets-only
  Cloudflare Worker, and a GitHub Actions workflow that runs `npx wrangler deploy` on a push to
  `main` (E14).
- Cloudflare's static-assets routing serves an asset before calling a Worker script, unless
  `run_worker_first` lists the route (E10). Spec 002 uses this.

### 1.7 Not measured

- Whether Astro's island loader runs under a content security policy of `script-src 'self'`, with
  no inline script. Phase 6 measures it and sets the policy (§5.1).
- The size of the island scripts. Phase 6 records it.
- The `Content-Type` the Worker gives `.md` and `.csv` files. Phase 5 reads it with
  `npx wrangler dev` and sets it in `public/_headers` if it is wrong.
- Which bot settings the new Cloudflare zone starts with, such as blocking AI crawlers or a managed
  `robots.txt`. Phase 7 reads them in the dashboard (§5.4).
- How each page renders on a phone. Phases 4 and 6 take screenshots at 390 px and 1280 px wide.
- Whether `posthog-js`, with recordings, surveys and the toolbar off, loads any script from
  `eu-assets.i.posthog.com`, and how many bytes it adds to the page's scripts. Phase 6 reads the
  browser's network log and records the size (§5.5).
- How PostHog's cookieless hash tells visitors apart: its inputs and how often it changes. E16 does
  not say. Phase 7 reads PostHog's cookieless tracking documentation before a visitor count is
  quoted anywhere.
- Whether every Apple runtime build whose number ends in a lowercase letter is a pre-release. The
  exporter's rule assumes so (§2.3); the run notes name only 27.3 (24C5037i) a beta.

---

## 2. The dataset

### 2.1 Files

| file | what |
| --- | --- |
| `data/devices.json` | the dataset: written by the exporter (§2.5), never edited by hand |
| `data/schema.json` | its JSON Schema, draft 2020-12 |
| `data/CHANGELOG.md` | one entry per dataset version: devices and runtimes added, values corrected |

### 2.2 A reading

The top level holds `version` (§2.4), `updated` (a date), `license` (`CC-BY-4.0`, D12), `units`,
`runs` and `devices`. `runs` describes each measurement run by id: its date, simulator or
emulator, and what it reads. A device holds `id`, `name`, `platform` (`ios`, `android`), `kind`
(`phone`, `tablet`, `foldable`), `unit` (`pt`, `dp`), `displays`, `current` and `readings`.
`displays` holds each display by id (`main`; `cover` and `inner` on a foldable) with its size in
the device's unit, its pixels, its `scale` (iOS) or `density` (Android) and the cutout's kind. For
a foldable, `screens` names each pose's screen (`closed`, `open`, `half-open`, `tent`) and its
display.

One reading of the iPhone 17 in portrait on iOS 27.0, from `data/devices.json` 1.0.0:

```json
{
  "runtime": { "os": "iOS", "version": "27.0", "build": "24A434", "prerelease": false },
  "measured": { "on": "simulator", "date": "2026-11-09",
                "runs": ["ios-2026-10-14", "ios-runtimes-2026-11-09", "ios-tabbar-2026-11-01"] },
  "screen": "main",
  "orientation": "portrait",
  "rotation": 0,
  "window": { "width": 402, "height": 874 },
  "pixels": { "width": 1206, "height": 2622 },
  "safeAreaInsets": { "top": 62, "bottom": 34, "left": 0, "right": 0 },
  "cornerRadii": {
    "profile": { "topLeft": 62, "topRight": 62, "bottomRight": 62, "bottomLeft": 62,
                 "source": "the simulator's device profile (capabilities.plist), read 2026-11-17" },
    "measured": { "topLeft": 62, "topRight": 62, "bottomRight": 62, "bottomLeft": 62,
                  "source": "SwiftUI concentricCornerRadii of a view that fills the window, iOS 27.0 (24A434)" }
  },
  "sizeClass": { "width": "compact", "height": "regular" },
  "statusBar": { "placement": "top", "frame": { "x": 0, "y": 0, "width": 402, "height": 54 } },
  "navigationBar": { "inline": { "top": 62, "height": 54 }, "large": { "top": 62, "height": 106 } },
  "tabBar": { "style": "capsule", "frame": { "x": 64, "y": 791, "width": 274, "height": 62 },
              "bottom": 21, "height": 62, "sideGap": 21 },
  "contentMargin": null,
  "regions": null,
  "fold": null,
  "missing": {
    "contentMargin": "not read on this runtime",
    "regions": "not read on this device"
  }
}
```

- Every position is in the device's unit, in window coordinates, origin at the window's top left,
  for that orientation. `cornerRadii` is given for the orientation, so a consumer does no rotation
  (D7).
- `orientation` is the window's shape. `rotation` is the angle from the display's natural
  orientation (UIKit's portrait on iOS): at 90 the device's top edge is on the window's left,
  UIKit's `landscapeRight` and Android's `ROTATION_90`. A device read in both landscapes has a
  reading at 90 and at 270.
- `measured.runs` names the runs the reading's values come from; `measured.date` is the newest of
  their dates. Two runs that read one value for the same device, build, screen and rotation agree
  within 0.01, or the export stops (§2.3).
- `cornerRadii` holds two value sets, `profile` and `measured`, each with a `source` that says
  where it came from (§2.3, D13).
- `statusBar.placement` is `top`, `hidden`, `left`, `right` or `navigation-bar` (the iPhone Duo's
  tall inner window, where the time sits in the navigation bar's row).
- `navigationBar` is UIKit's bar with an inline and with a large title; on Android, `inline` is
  Material 3's `TopAppBar` inside the safe area.
- `tabBar.style` is `capsule` (iOS 26 and later), `bar` (iOS 18 and Android's navigation bar) or
  `column` (the iPhone Duo, in a side inset). `frame` holds three tabs; `sideGap` is the capsule's
  smallest gap to a side edge with five tabs with long titles. On the iPads the tab bar sits at
  the top, so `tabBar` is `null` with that reason.
- Android readings add `systemBarInsets` and `cutoutInsets` beside the combined `safeAreaInsets`,
  and `sizeClassV2` beside `sizeClass` (the window size classes V1 and V2).
- `regions` lists occlusion regions and the Android display cutout with `kind`, `frame` and
  `active`.
- `fold` holds `axis`, `frame`, `margin` and `separates`.
- A field no run measured is `null`, and `missing` gives the reason per field path (D5). A screen
  with no hinge across it has a `null` `fold` with no reason.

A device's `current` names the reading set a page shows first, by version and build: the newest
build that is not a pre-release and has a reading in each screen and rotation the device has (D6,
D14). Where no build has them all, it is the build with the most, newest first.

### 2.3 Rules the exporter applies

- **Android sizes come from pixels.** dp = px × 160 ÷ density, kept to 2 decimals: the Pixel 8 is
  411.43 × 914.29 dp with a 50.29 dp status bar.
- **Inset order is read per source.** The runs store insets as top, bottom, left, right in some
  files and top, left, bottom, right in others. The exporter maps each source by name, and the data
  check of §6 compares the readings two sources hold for the same device, runtime and orientation.
  A difference above 0.01 fails the export unless the run notes record it, as §1.2 records the
  builds' differences.
- **Corner radii are published twice, each with its source** (D13).
  - `profile`: on iOS the simulator's device profile (`capabilities.plist`); on Android the
    emulator's display configuration, as `dumpsys display` reports it.
  - `measured`: SwiftUI's `concentricCornerRadii` for a view that fills the window, on the runtimes
    where the runs read it; on iOS 18.6, the corners of the view behind a full-screen sheet.
  - Each `source` names its reading and runtime. Where the two differ, as on the iPads on iOS 27.2
    and 27.3 (§1.2), the device page shows both with their sources, and the drawing uses
    `profile`.
- **Pre-release runtimes are published and marked** (D14). A reading on a pre-release build
  carries `prerelease: true`, and `current` never names one. The exporter treats a build number
  that ends in a lowercase letter as pre-release, which marks 27.2 24B5089g and 24B91016s and 27.3
  24C5037i (§1.7).

### 2.4 Versioning

`version` is semantic: a major version changes the schema incompatibly and gets a new data path
(D11); a minor version adds devices, runtimes or fields; a patch corrects values. Each version has an
entry in `data/CHANGELOG.md`, and `updated` is the export's date.

### 2.5 The exporter

The exporter lives in the private measurement repository (E13, D8). It reads the run files, applies
§2.3, and writes `data/devices.json` into a checkout of this repository. Its run prints the counts of
devices, runtimes and readings, which the commit message of each dataset change quotes. The site
reads only `data/devices.json`.

---

## 3. The pages

### 3.1 URLs

| URL | what |
| --- | --- |
| `/` | what the site is; the device table with each device's current reading; the links for agents |
| `/devices/<id>` | one page per device: the explorer, then a table per screen, orientation and runtime |
| `/compare` | two to eight devices drawn to scale on top of each other; `?ids=iphone-17,pixel-8` |
| `/runtimes` | what changed between OS versions, from the readings: bar heights, insets, components |
| `/playground` | pixel snapping, corner fit, and "this device" |
| `/guide` | points, pixels and dp; corner radii; safe areas; system bars; margins; size classes; foldables |
| `/agents` | the data files, the schema, the license, how to cite; spec 002 adds the MCP server and the skill |
| `/method` | how each value is read, with which API or command, on which runtime; what no run measured |
| `/changelog` | `data/CHANGELOG.md` |
| `/privacy` | what PostHog receives from the pages, that it stores it in PostHog's EU region, and that the site sets no cookie (§5.5); spec 002 adds the Worker's events and the rate limit's count per hashed client address, each with the code that sends or keeps it |
| any other path | the 404 page |

### 3.2 What each page shows

- A device page starts with the explorer at the device's current reading, then a table per
  screen and orientation with a column per runtime, so a reader sees where a value changes. Each
  value that is `null` shows its reason.
- A runtime column for a pre-release build is headed with its version and "beta" (D14). Where a
  device has both corner radii, the page shows both, each with its source (D13).
- Every page footer reads "Measured by Modaal", with a link to modaal.dev (D2), the dataset version
  and its date, and links `/privacy`.
- The guide's text comes from the docs article (E1), rewritten around the dataset's numbers.

### 3.3 Rendering

Every number reaches the HTML at build time: tables and the drawing of each device's current
reading. A visitor without JavaScript, a search engine and an agent that reads HTML all get every
value. The interactive parts of §3.4 hydrate over that HTML.

### 3.4 Interactive parts

Preact components, rendered on the server and hydrated in the browser (D9):

- **The explorer**, from the docs page (E1): platform, device, screen and orientation pickers, a
  runtime picker, the drawing with its layers (safe area, system bars, corners, cutout, margins,
  fold), and the table whose rows highlight their part of the drawing.
- **The comparison**: the chosen devices' outlines to scale in pt and dp, aligned at the top left
  or the centre, with each one's safe area.
- **The playgrounds**: pixel snapping and corner fit from the docs page, and "this device", which
  reads the visitor's CSS `env(safe-area-inset-*)`, `devicePixelRatio` and screen size, and names
  the measured device closest to them.
- **`src/lib/geometry.ts`**: the arithmetic the playgrounds use, pixel snapping and the fit of a
  frame's corner against the display's (the depth inside or outside the curve, and the concentric
  radius). Spec 002's `check_layout` imports the same file and adds its other findings to it
  (spec 002 §2.4).

---

## 4. Files for agents

### 4.1 Data files

| URL | what |
| --- | --- |
| `/data/v1/devices.json` | `data/devices.json` as it is |
| `/data/v1/devices/<id>.json` | one device |
| `/data/v1/devices.csv` | one row per device, screen, orientation and runtime; nested fields flattened with `_` |
| `/data/v1/schema.json` | `data/schema.json` |
| `/data/v1/version.json` | `version`, `updated`, and the counts of devices, runtimes and readings |

### 4.2 Text for language models

- `/llms.txt` follows E11: the site's name as H1, a one-sentence summary as a blockquote, then
  sections of links: the data files, the device pages, the guide; an `Optional` section for the
  changelog and method.
- `/llms-full.txt`: every device's current reading as Markdown tables, and the guide.
- Every page has a Markdown copy at its path plus `.md` (`/devices/iphone-17.md`, `/index.md` for
  `/`), written from the dataset, not converted from the HTML. Spec 002 §3 serves it to requests
  that send `Accept: text/markdown`.

### 4.3 Search engines and crawlers

- `robots.txt` allows every crawler, AI crawlers included, and names the sitemap.
- `sitemap.xml` lists every page.
- `/` and `/agents` carry a schema.org `Dataset` in JSON-LD (E12): name, description, license,
  `dateModified`, `creator` Modaal, and a `distribution` entry per data file.

### 4.4 Response headers

Set in `public/_headers`:

- `Access-Control-Allow-Origin: *` on `/data/*`, `/llms.txt`, `/llms-full.txt` and every `.md`
  file.
- `Cache-Control: public, max-age=3600` on `/data/*`.
- The content security policy (§5.1), `X-Content-Type-Options: nosniff` and
  `Referrer-Policy: strict-origin-when-cross-origin` on every path.

---

## 5. Hosting and the repository

### 5.1 The Worker

`wrangler.jsonc` names the Worker `screens-guide`, serves `dist/` as static assets with
`not_found_handling: "404-page"` and `html_handling: "auto-trailing-slash"`, and runs no script
until spec 002 phase 2. The content security policy allows scripts and styles from the site's own
origin only, and connections to the site's own origin and `https://eu.i.posthog.com` (§5.5); phase 6
adds what §1.7's first and sixth items find the island loader and `posthog-js` need.

### 5.2 Deploy

`.github/workflows/deploy.yml` runs `npm ci`, the checks of §6 and `npm run build` on every pull
request and every push to `main`, and `npx wrangler deploy` on a push to `main`. It reads Node's
version from `.node-version` (24) and needs the repository secret `CLOUDFLARE_API_TOKEN` and the
variable `CLOUDFLARE_ACCOUNT_ID`.

### 5.3 Repository files

- `AGENTS.md`, `CLAUDE.md` (a byte-identical copy), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `.gitignore` and `scripts/check-agent-rules.sh`, from the `repository-init` skill (E15), with the
  `writing-style`, `git-discipline` and `spec-driven-development` sections.
- `scripts/check-skills.sh`, adapted from the same repository's checks of skills, plugin manifests
  and spec references, with its `--self-test`.
- `.github/workflows/ci.yml`, with two jobs on every pull request and push to `main`: `rules` runs
  `scripts/check-agent-rules.sh`, and `skills` runs `scripts/check-skills.sh` and its self-test.
- `SECURITY.md` sends reports to GitHub's private vulnerability reporting. The user turns it on in
  the repository's settings (**Settings → Advanced Security → Private vulnerability reporting**);
  it was off on 2026-11-17 (§1.1).
- `AGENTS.md` adds this repository's rules:
  - The repository is public. A commit, comment, page or generated file names no private
    repository, internal path or internal project.
  - `data/devices.json` changes only by an export (§2.5), and each change bumps `version` and adds
    a `data/CHANGELOG.md` entry.
  - Pages, data copies and Markdown copies are generated from `data/devices.json`; a page holds no
    number of its own.
  - The probe apps and readers stay in the private measurement repository; this repository holds
    none of their source (D8, §10.5).
- `LICENSE`: MIT, for everything outside `data/`. `LICENSE-DATA`: CC BY 4.0, for `data/` and its
  copies the site serves under `/data/` (D12). `README.md` says which file covers which path.

### 5.4 The domain

`screens.guide` is registered at Cloudflare Registrar, and its zone is on Cloudflare's nameservers
(§1.5). Phase 7 attaches it to the Worker as a custom domain with
`"routes": [{ "pattern": "screens.guide", "custom_domain": true }]` in `wrangler.jsonc`. In the
zone's bot settings, any setting that blocks AI crawlers or replaces `robots.txt` is turned off
(§1.7).

### 5.5 Analytics

- PostHog, project token `phc_uUCsuu3u789nj9y6wBqTqDhffPrnbJwn9P75ezSyK4pf`, in the EU region
  (§1.6). The token is the project's public key, which every browser sends with each event.
  `src/lib/analytics.ts` holds it and the host `https://eu.i.posthog.com` as constants; spec 002's
  Worker imports the same constants.
- The layout starts `posthog-js` (from npm, bundled by Astro into `/_astro/`) with
  `cookieless_mode: 'always'`, `autocapture: false`, `capture_pageview: true`, and session
  recording, surveys and heatmaps off. It sets no cookie and writes nothing to local or session
  storage (E16).
- It starts only when `location.hostname` is `screens.guide`, so `npx wrangler dev`, CI and
  previews send nothing.
- Named events from the interactive parts of §3.4, with no free text in any property:

  | event | when | properties |
  | --- | --- | --- |
  | `explorer_changed` | a picker in the explorer changes | `device`, `screen`, `orientation`, `runtime` |
  | `compare_changed` | the comparison's device list changes | `ids` |
  | `playground_used` | a playground's first input on a page | `playground`: `pixel-snapping`, `corner-fit` or `this-device`; for `this-device`, the closest measured device's id |
  | `data_link_clicked` | a link to a file of §4.1, `llms.txt`, a `.md` copy or the skill | `url` |

- `connect-src` in the content security policy names `https://eu.i.posthog.com`. `script-src`
  stays `'self'` unless phase 6 finds `posthog-js` loading a script from
  `eu-assets.i.posthog.com` (§1.7).
- Spec 002 §2.5 sends events for the requests the Worker serves: MCP messages, pages, and the
  files agents fetch.
- `/privacy` (§3.1) lists the events of this section. Spec 002's phases add the Worker's events
  (spec 002 §2.5) and the rate limit's count (spec 002 §2.6) to it, each in the pull request that
  adds the code, as `AGENTS.md` §"The dataset and the pages" requires.
- The user's step in phase 7: turn on cookieless mode in the PostHog project's settings. Without
  it PostHog drops the pages' events (§1.6).

---

## 6. Checks

Each phase runs the checks that exist by then; CI runs them on every pull request.

- `npm run build`.
- `npm run check:data`: `data/devices.json` validates against `data/schema.json`; every inset is at
  least 0 and the insets leave a positive safe area; every corner radius is at most half the shorter
  side; on iOS, window × scale equals pixels to within 1 px; on Android, dp × density ÷ 160 equals
  pixels to within 0.5 px; ids are unique and lowercase with hyphens; every device has a `current`
  reading set.
- `npm test` (vitest): the CSV round-trips to the JSON's values; `llms.txt` lists every page; every
  page has its `.md` copy and every device its JSON file; the device table on `/` has one row per
  device; analytics starts on the host `screens.guide` and on no other host; `src/lib/geometry.ts`
  gives the corner cases of spec 002 §2.3 on the iPhone 17, radius 62 pt: a square corner 16 pt
  from the side and 34 pt from the bottom lies 8.15 pt inside the curve, at 16 pt from both edges
  it is cut off by 3.05 pt, and the concentric radius for a 16 pt margin is 46 pt.
- `bash scripts/check-agent-rules.sh`.
- With `npx wrangler dev`: each URL of §3.1 and §4 answers 200 with the expected `Content-Type`; an
  unknown path answers 404; the headers of §4.4 arrive.
- Screenshots in light and dark, at 390 px and 1280 px wide, show no horizontal scroll.
- With `npx wrangler dev`, the browser's network log shows no request to a PostHog host and the
  console no content security policy violation.
- Phase 7 reruns the `wrangler dev` checks against https://screens.guide. There, a page view
  reaches the PostHog project, the console shows no content security policy violation, and the
  browser holds no cookie and no local or session storage entry for the site.

---

## 7. Phasing

| phase | what lands | why here |
| --- | --- | --- |
| 1 | `specs/001-site-and-dataset/spec.md` | the spec opens the series; specs 002 and 003 land in the same commit, because the three cite each other's sections |
| 2 | the repository files of §5.3, the two license files among them | every later phase follows `AGENTS.md` |
| 3 | `package.json` and its lockfile, `.node-version`, `data/devices.json`, `data/schema.json`, `data/CHANGELOG.md`, `npm run check:data` and its CI job; the exporter's commit in the private repository beside it | the pages read the dataset; `npm run check:data` is the first npm script, so `package.json` arrives with it |
| 4 | `astro.config.mjs`, the layout and stylesheet, and the pages of §3.1 with their tables and drawings, no islands | the pages are what phases 5 and 6 extend |
| 5 | the files of §4 and their tests | written from the same data the pages use |
| 6 | the interactive parts of §3.4 with `src/lib/geometry.ts` and its tests, `src/lib/analytics.ts` and the events of §5.5, `/privacy` with those events, and the content security policy they need | the HTML they hydrate exists from phase 4; the events come from the interactive parts |
| 7 | `wrangler.jsonc` with the custom domain, `public/_headers`, `deploy.yml`; then the user's steps: the secret and variable, the zone's bot settings, PostHog's cookieless setting; the first deploy and the live checks | the site goes live once it is complete; the GitHub repository exists since 2026-11-17 (§1.1) |

Commit subjects carry the prefix `[001-site-and-dataset]`.

### 7.1 What each phase landed

| phase | landed | departures from the plan |
| --- | --- | --- |
| 1 | `52aa47d`, with specs 002 and 003 | — |
| 2 | `77f08eb`, the repository's first commit | landed before phase 1, the spec; `scripts/check-skills.sh` and the `skills` job added beside the agent rules check; turning on private vulnerability reporting, which `SECURITY.md` names, added to the user's steps (§5.3) |
| 3 | `37a3da0`, with the exporter's two commits in the private measurement repository (E13) | the reading of §2.2 gained `rotation`, `measured.runs`, the top-level `runs`, `displays` keyed by display (the plan had one `display`), `screens` for the foldables only, the Android fields `systemBarInsets`, `cutoutInsets` and `sizeClassV2`, `tabBar.frame`, and `prerelease` on every runtime; the iPhone 17 Pro's 27.2 run left out because it recorded no build (§1.2); `ajv` 8.20.0 added for the schema check; the CI job is `site`, which phase 4 extends with the build |
| 4 | `d9bc09e` | `src/lib/geometry.ts` and its tests came forward from phase 6, because `/playground` shows pixel snapping and corner fit as static tables computed with it; `/privacy` landed with the facts that hold before analytics (no cookie, no browser storage, Cloudflare's request logs), and phase 6 adds PostHog's events; `/compare` draws the four devices of `COMPARE_DEFAULT` (`src/lib/data.ts`), and phase 6's island reads `?ids`; the CI job `site` runs `npm run check` (astro check, with `@astrojs/check` 0.9.12, `typescript` 6.0.3 and `@types/node` 24.19.2) and `npm run build` before `npm test`; `tests/site.test.ts` reads `dist/` and also fails on a word joined to the value after it, because Astro drops the line break before a line that starts with an expression or an inline element |
| 5 | `f16069f` | each page's text moved into a `Doc` of blocks in `src/lib/pages/`, which the `.astro` page renders and `markdownCopy()` writes as the `.md` copy, so the text is written once (CONTRIBUTING.md §"Pages and their Markdown copies"); `/data/v1/devices/<id>.json` holds the device with the dataset's `version`, `updated`, `license`, `units` and the runs its readings name; `devices.csv` has one row per reading, with device columns, `display_scale`, `display_density` and `current` first, and lists and `missing` as JSON text; `version.json` adds the schema's URL; `llms-full.txt` gives each device one table of its current build, a column per screen and rotation; `llms.txt`'s sections are Data files, Devices, Pages and Optional; the headers of §4.4 land with `public/_headers` in phase 7 |

---

## 8. Decisions

**D1 — The name and domain are `screens.guide`.** Checked over RDAP on 2026-11-17 (E7),
these were unregistered too: `safearea.dev` (the term iOS, CSS, Flutter and React Native use),
`insets.dev`, `screensizes.dev` (matches the search phrase "iPhone screen sizes") and
`edgeinsets.com`. `safearea.com` (1999), `screensizes.com` (2011) and `insets.com` (2002) are
registered. The user named `screens.guide` as the working name on 2026-11-17 and registered it the
same day (§1.5, §10.3).

**D2 — Modaal publishes the site.** The footer reads "Measured by Modaal" with a link to
modaal.dev, and the repository is `modaal-agent/screens-guide` (§10.1). A personal account or no
publisher were the alternatives. Decided by the user on 2026-11-17.

**D3 — The site launches with every reading already recorded, and data rounds follow.** Measuring
the remaining simulator types first would take hours of simulator time and delay the launch. Adding
older models from published spec sheets would mix unmeasured rows into a measured dataset (D5).
Decided by the user on 2026-11-17; spec 003 plans the rounds.

**D4 — Agents get static files, an MCP server and a skill.** Static files alone would need no
Worker script. Decided by the user on 2026-11-17; spec 002 holds the MCP server and the skill.

**D5 — Measured values only.** A value no run measured is `null` with a reason, never an estimate
or a spec-sheet number. The catalog's generic rows and its iPad split-window estimates stay out
(§1.2). The cost: 22 devices where ios-resolution.com lists 144 (§1.4).

**D6 — One reading per device, runtime, screen and orientation.** One value per device would be
simpler and would hide measured changes, such as the inline navigation bar's 44 pt on iOS 18.6 and
54 pt on 26.5 (§1.2). The cost is a larger file and the rule that picks `current` (§2.2).

**D7 — Named keys, and geometry given per orientation.** The run files store insets in two orders
(§2.3), and the docs page's explorer rotates corner radii and points in code for each landscape view
(E1). Named keys and per-orientation values remove both from every consumer. The cost: a larger
file, which gzip reduces.

**D8 — The exporter and the probes stay private; this repository holds the dataset and its
checks.** Publishing the run files and the converter would let anyone rebuild the dataset, and
would put internal paths and several megabytes of run files into a public repository. The probe app
and the Android readers stay in the private measurement repository too (§10.5). The cost: an outside
reader can neither regenerate the data nor rerun a probe. `/method` names the API or command behind
each value, with the runtime it was read on, so a reader can repeat a reading with their own code.
The probes' place was decided by the user on 2026-11-17.

**D9 — Astro builds static pages, and Preact renders the islands on the server and hydrates them.**
The docs site (E1) hosts its pages on Mintlify's servers, which cannot serve this repository's data
files with CORS headers or run spec 002's MCP endpoint. Plain HTML with hand-written scripts would
draw the device once in the build and again in the browser, in two implementations. Preact keeps the
docs page's explorer code close to its JSX. The cost is Node and a build step, and the island
scripts' size, which phase 6 records.

**D10 — An assets-only Cloudflare Worker, deployed from GitHub Actions.** The user's other site runs
the same way (E14), so one deploy procedure serves both. Cloudflare Pages and Workers Builds were the
alternatives. The cost: a Cloudflare API token as a repository secret.

**D11 — Data URLs carry the major version, `/data/v1/`.** A schema change that breaks consumers
publishes `/data/v2/` beside v1, and v1 stays served. An unversioned path would change shape under an
agent that parses it. The cost: two copies while both are served.

**D12 — MIT for the code, CC BY 4.0 for the dataset.** CC BY 4.0 lets anyone copy, change and
redistribute the data, commercially too, as long as they credit the source. CC0 would drop the
credit, and the site's "Measured by Modaal" line would not travel with the data. A database license
such as ODC-By asks for the same credit and is less known outside open-data projects. Decided by the
user on 2026-11-17.

**D13 — Both corner radii are published, each with a note of where it came from.** On the iPads on
iOS 27.2 and 27.3, the device profile and SwiftUI disagree: 21.5, 25 or 30 pt against 32 pt
(§1.2). Publishing the profile's value alone would hide what SwiftUI gives a view that fills the
window. Publishing SwiftUI's alone would draw a display outline that does not match the device
profile, and leave the devices with no SwiftUI reading without a value. The cost: two fields where
a reader expects one, which the device page labels. Decided by the user on 2026-11-17.

**D14 — Readings on pre-release runtimes are published, marked as pre-release.** Holding them back
until the release would hide changes such as the iPhone SE's insets on the 27.3 beta (§1.2), which
an app has to handle once the release ships. The cost: a beta value can change by the release, so
it is never `current` and its column says "beta". Decided by the user on 2026-11-17.

**D15 — PostHog in cookieless mode, sending straight to PostHog's EU host.** The user chose
PostHog and its project on 2026-11-17. This spec chooses how the pages use it:

- `cookieless_mode: 'always'` sets no cookie and no storage entry (§1.6), so the site shows no
  consent banner. The cost: PostHog's server-side hash, not a stored id, decides which page views
  belong to one visitor (§1.7).
- `posthog-js` is bundled from npm, so `script-src` stays `'self'`. Loading PostHog's snippet from
  its CDN would add a third-party script host to the policy.
- Events go to `https://eu.i.posthog.com` directly. The alternative, a proxy at `/ingest` in the
  Worker, would also count visitors whose ad blocker blocks PostHog's hosts; it would cost a Worker
  request per event, and the Worker gets a script only in spec 002 phase 2. The cost of the direct
  host: those visitors' page views are not counted.
- Cloudflare Web Analytics was the other option. It counts visits without cookies, and records no
  named events and no events from the Worker.

---

## 9. Non-goals

- Physical size, weight, PPI and diagonal. No run measured them, and spec sheets publish them.
- Apple Watch, Apple TV, Vision Pro, CarPlay and Android Auto.
- Android devices other than Google's emulator profiles. Spec 003 may add some.
- Accounts, comments and translations.

---

## 10. Open questions

**10.1 — Which GitHub organisation owns the repository?** Modaal's docs are under `modaaldev`, its
public tools under `modaal-agent`. Needs an answer before the first push, in phase 7.

*Answered 2026-11-17:* `modaal-agent`. The repository is `modaal-agent/screens-guide` (D2).

**10.2 — Which licenses?** Proposed: MIT for the code, CC BY 4.0 for the dataset, which asks for
credit and nothing else. Needs an answer before phase 2.

*Answered 2026-11-17:* MIT for the code, CC BY 4.0 for the data (D12, §5.3).

**10.3 — Is `screens.guide` the final domain, at the price the registrar quotes?** Needs an answer
before phase 7.

*Answered 2026-11-17:* yes. The user registered `screens.guide` through Cloudflare Registrar that day
(§1.5, §5.4, D1).

**10.4 — What happens to the docs article (E1)?** Options: it links to the site as the data source
and keeps its explorer; or it keeps its prose and replaces the explorer with a link. Needs an answer
after phase 7; the change is a pull request in the docs repository.

*Answered 2026-11-17:* the docs article stays a separate page with its own explorer. It is updated by
hand from the data each round collects (spec 003); this repository writes nothing into the docs
repository.

**10.5 — Publish the probes?** The iOS probe app and the Android readers would let anyone repeat a
reading. Publishing them needs a public copy with no internal references. Needs an answer before
phase 4, which writes `/method`.

*Answered 2026-11-17:* no. The probes stay in the private measurement repository, and this
repository holds none of their source (§5.3, D8).

**10.6 — Analytics?** Cloudflare's cookie-free Web Analytics would count visits; Workers logs count
agent requests (spec 002 §1.9). Analytics changes the content security policy. Needs an answer
before phase 7.

*Answered 2026-11-17:* PostHog, with the project token `phc_uUCsuu3u789nj9y6wBqTqDhffPrnbJwn9P75ezSyK4pf`
(§5.5, D15; spec 002 §2.5).

**10.7 — Which corner radius does `cornerRadii` hold on the iPads?** The device profile's 21.5, 25
and 30 pt, or SwiftUI's 32 pt on iOS 27.2 and 27.3 (§1.2)? Proposed: the profile's value as
`cornerRadii`, and SwiftUI's as `containerCornerRadii` per runtime, both shown on the device page.
Needs an answer before phase 3.

*Answered 2026-11-17:* publish both, the profile's value and the measured one, each with a note of
where it came from. They are `cornerRadii.profile` and `cornerRadii.measured` (§2.2, §2.3, D13).

**10.8 — Publish pre-release runtimes?** The 27.3 beta readings include the iPhone SE's changed
insets (§1.2). Proposed: publish them with `prerelease: true`, never as `current`, and check them
again on the release. Needs an answer before phase 3.

*Answered 2026-11-17:* publish them as beta, marked pre-release (§2.3, §3.2, D14).

---

## 11. External references

| id | reference | public | URL and pin | cited in |
| --- | --- | --- | --- | --- |
| E1 | "iOS and Android Screen Sizes, Safe Areas and Corner Radii", Modaal docs | yes | https://docs.modaal.dev/articles/screen-design-constraints; source `articles/screen-design-constraints.mdx` and `snippets/screen-constraints.jsx` in https://github.com/modaaldev/docs at `007c96c` | §1.3, §3.2, §3.4, D7, D9, §10.4 |
| E2 | iOS Resolution | yes | https://www.ios-resolution.com/; unversioned, read 2026-11-17 | §1.4 |
| E3 | iOS Ref, resolutions | yes | https://iosref.com/res; unversioned, read 2026-11-17 | §1.4 |
| E4 | agood, iPhone dimensions chart | yes | https://www.agood.com/pages/iphone-dimensions-chart; unversioned, read 2026-11-17 | §1.4 |
| E5 | remobile, iPhone size comparison | yes | https://remobile.eu/nl-en/blog/iphone-size-comparison-all-models-and-screen-sizes-in-one-place/; dated 2026-06-05, read 2026-11-17 | §1.4 |
| E6 | WishKit, iPhone screen sizes | yes | https://www.wishkit.io/free-tools/iphone-screen-sizes; "checked October 8, 2026", read 2026-11-17 | §1.4 |
| E7 | IANA RDAP bootstrap for DNS, and the registries' RDAP services | yes | https://data.iana.org/rdap/dns.json; queried 2026-11-17 | §1.5, D1 |
| E8 | Cloudflare Registrar, TLD policies | yes | https://www.cloudflare.com/tld-policies/; unversioned, read 2026-11-17 | §1.5 |
| E9 | npm registry: `astro`, `@astrojs/preact`, `preact`, `wrangler`, `vitest`, `posthog-js` | yes | https://www.npmjs.com/; versions as named in §1.6, read 2026-11-17 | §1.6 |
| E10 | Cloudflare Workers docs, static assets routing | yes | https://developers.cloudflare.com/workers/static-assets/routing/worker-script/; unversioned, read 2026-11-17 | §1.6 |
| E11 | The `llms.txt` file format | yes | https://llmstxt.org/; page modified 2026-08-10, read 2026-11-17 | §4.2 |
| E12 | schema.org `Dataset` | yes | https://schema.org/Dataset; unversioned | §4.3 |
| E13 | *Redacted:* Modaal's device measurement runs (simulator and emulator readings from 2026-09-29 to 2026-11-10, their run notes, and the device catalog built from them) and the exporter's planned location; inventoried 2026-11-17 | no | — | §1.2, §2.5, D8 |
| E14 | *Redacted:* the repository of another of the user's sites, built and deployed as §5 describes; read 2026-11-17 | no | — | §1.6, D10 |
| E15 | `modaal-agent/skills`: `repository-init`, `writing-style`, `git-discipline`, `spec-driven-development`, and `scripts/check-skills.sh` | yes | https://github.com/modaal-agent/skills at `4cf5fcc` | §5.3 |
| E16 | PostHog docs, "JavaScript configuration" | yes | https://posthog.com/docs/libraries/js/config; unversioned, read 2026-11-17 | §1.6, §1.7, §5.5, D15 |
