# 003 — Data rounds: the recorded component readings, then more devices

**Status:** Written 2026-11-17, revised in place the same day with spec 001's answer on the probes
(spec 001 §10.5) and the answers to §8.1 to §8.4. Revised on 2026-11-19 with the repository and
the site after specs 001 and 002 landed (§1.5), the recorded readings §1.1 left out, the device and
runtime list of R2 to R4 (§2.1), the changes a round makes besides the export (§3.1), and §8.5
and §8.6. Revised on 2026-11-23 with the answers to §8.5 and §8.6 (D5, D6, §7). Not
implemented: no round has started. **Baseline:** `main` at `9a0db6b`.
**Obsoletes:** nothing.

**Relates to:**

- spec 001 §1.2 — the 22 devices and the runtimes the launch dataset holds.
- spec 001 §2 — the dataset each round adds to, its rules and its versioning.
- spec 002 §2.2 — the MCP tools, which read whatever the dataset holds.
- §9 — every external reference this spec makes.

---

## 0. TL;DR

1. **The launch dataset holds 22 devices; this Mac's simulators and emulators can run 50 more
   iPhones and iPads and 33 more Android profiles** (§1.2, §1.3). screens.guide has served it as
   dataset 1.0.0 since 2026-11-18 (§1.5).
2. **The runs have also recorded system components that spec 001 does not publish**: sheets,
   alerts, menus and rows on iOS; Material 3's app bars, floating action button, snackbar, dialog and
   sheet on Android (§1.1).
3. **Seven rounds, run one at a time in their numeric order.** R1 publishes the recorded
   components with no new run. R2 to R6 measure more devices and new fields. R8 repeats the
   measurements on each new OS release. R7 is withdrawn: the floor is iOS 18 (§2, D1, §8.2).
4. **R2 to R4 add 25 iPhones, 25 iPads and 20 Android profiles**, each on the newest release
   runtime that runs it: iOS 27.2 for 41 of the 50 Apple devices, 26.5 for 5, 18.6 for 4, and
   Android 16 for every profile (§2.1). 13 older Pixel profiles are in no round (D6).
5. **Each round lands in this repository as one commit in a pull request**: the export, a minor
   dataset version and its changelog entry (§3). The skill's tests check each device a round adds
   against the claims that hold over every device of a kind; a round that adds fields also changes
   two MCP tools' output schemas and publishes a new `server.json` version (§3.1).
6. **The probes stay in the private measurement repository** (spec 001 §10.5). A round that
   extends a probe changes it there, and this repository receives only the export (§3).
7. **All six questions are answered** (§8). R6 measures the default keyboard, the number pad and
   the iPad's hardware-keyboard bar (D4). R1's schema, selection rules, page and tool are written
   into this spec and spec 002, and reviewed, before R1 is built (D5). No round measures the 13
   Pixel profiles older than `pixel_6` (D6), Display Zoom, or Android at a font scale other than 1
   (§7).

---

## 1. Current state (measured 2026-11-17)

### 1.1 Readings recorded and not in the launch dataset

From the inventory of Modaal's measurement runs (E1), 2026-11-17. On iOS, read on the iPhone 16
(26.5), the iPhone 17 (27.0), the iPhone SE (3rd generation) (27.0) and the iPhone Duo (27.1), and
on the devices of the 2026-11-09 runs:

- Sheets: the form sheet is 580 × 640 pt on iOS 18.6 and 580 × 660 on 27.x; the large sheet on the
  iPhone 16 (26.5) is (0, 59, 393, 793); the medium sheet's frame and the scale of the view behind
  it; the grabber is 36 × 5 pt on 26.5 and 60 × 4 on 27.x; on the iPhone Duo's inner window a sheet
  is a 540 pt wide card.
- Alerts: 270 pt wide with a 13 pt radius on 18.6, 320 pt with 34 pt on 26.5 and later.
- Menus 250 pt wide with 42 pt rows; form rows 52 pt; list rows 52 and 70.67 pt.
- The bottom toolbar's capsules: 48 pt tall, 28 pt above the bottom edge.
- The large-title bar heights at the xxxL and AX5 text sizes.
- The search band below the inline bar: 60 pt on iOS 26.5 and 54 pt on 27.0, holding a 44 pt
  search field 16 pt from the side edges (the iPhone 16 and 17).
- The status bar's contents, read from screenshots on 2026-11-02: the time's font size, 17.99 pt on
  the iPhone 17 (27.0) and 16.99 pt on the iPhone 16 (26.5), its baseline and centre, and the
  icons' positions.
- The iPhone Duo's vertical tab bar (27.1): a capsule 48 pt wide, 24 pt from the window's side and
  bottom edges, 162 pt tall for 3 tabs and 262 pt for 5; the `UITabBar` is (397, 0, 69, 678) on
  the cover in portrait.

The iOS readings are raw run output, one record per scene and condition, not one value per
component. The 2026-11-09 runs alone hold 510 alert records, read in light and dark appearance,
in landscape, at the xxxL and AX5 text sizes and in six iPhone Duo states: the radius reads 34 pt
in 351, 13 pt in 81 and nothing in 78. They hold 636 sheet records: the grabber reads 60 × 4 pt
in 194, 36 × 5 in 63, 57.44 to 57.82 × 3.83 to 3.85 in 111, 34.46 to 34.53 × 4.79 to 4.80 in 23,
and is absent in 245. Publishing them needs a rule for each value (§8.5).

On Android, read on the Pixel 8 and the 360 dp phone at API 36, with Compose `material3` 1.3.2:

- Top app bar 64 dp below the top inset; medium 112 dp and large 152 dp, which collapse over 48 and
  88 dp of scroll.
- Navigation bar 80 dp above the 24 dp bottom inset; bottom app bar 80 dp.
- Floating action button 56 dp; snackbar with a 12 dp margin; search bar 56 dp tall, 8 dp below the
  top inset.
- Dialog 320 × 248.38 dp with a 28 dp radius; bottom sheet radius 28 dp; menus at least 112 dp wide.
- The small phone's reading with no cutout overlay, which has a 24 dp status bar.

### 1.2 iOS simulators on this Mac

`xcrun simctl list runtimes -j`, 2026-11-17: runtimes 18.6, 26.5, 27.0, 27.1 (the iPhone Duo only),
27.2 and 27.3 beta. Together they run 37 iPhone models and 30 iPad screen sizes, counting the 16 GB
variants of an iPad Pro once.

- **25 iPhones without a reading:** XS, XS Max and XR (iOS 18.6 only); 11, 11 Pro, 11 Pro Max,
  SE (2nd generation), 12 mini, 12, 12 Pro, 12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, 14,
  14 Plus, 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16 Plus and 16 Pro.
- **25 iPads without a reading:** iPad Pro 11-inch (M4) and 13-inch (M4); iPad Air 11-inch and
  13-inch (M2, M3 and M4); iPad Pro 11-inch (1st to 4th generation) and 12.9-inch (3rd to 6th);
  iPad (7th to 10th generation); iPad Air (3rd to 5th generation); iPad mini (5th and 6th
  generation).
- `xcrun simctl list devicetypes` also lists the iPhone X, 8, 8 Plus, 7, 7 Plus, SE (1st
  generation), 6s and 6s Plus. No installed runtime runs them.

### 1.3 Android emulator profiles on this Mac

`avdmanager list device -c`, 2026-11-17: 38 phone, tablet and foldable profiles. The only system
image installed is `android-36` with Google APIs. Five profiles have readings (spec 001 §1.2). The
33 others are `pixel_6` to `pixel_10` with their Pro, XL and a variants, `pixel_10_pro_fold`, the
older Pixels from `pixel` to `pixel_5` and `pixel_c`, and the generic `medium_phone`,
`small_tablet` and `medium_tablet`.

### 1.4 Not measured by any run

- Keyboard heights.
- The Dynamic Island's and the notch's frames. UIKit reports an occlusion strip across the top
  (393 × 54 pt on the iPhone 16), not the island's own frame.
- iPad Split View and Stage Manager window sizes.
- Display Zoom, and Android at a font scale other than 1.
- Which input method the `android-36` Google APIs image uses by default. R6 reads it with
  `adb shell settings get secure default_input_method` before it measures (D4).
- How long one device takes to measure. Phase 2 times R1's export, and phase 3 times each device of
  R2.

### 1.5 The repository and the site after the launch (read 2026-11-19)

- `main` at `9a0db6b` holds the code of specs 001 and 002, merged from pull request #1 on
  2026-11-18. The deploy workflow's run 44375511902 published it, and
  `https://screens.guide/data/v1/version.json` reads dataset 1.0.0 of 2026-11-17: 22 devices,
  10 runtime builds. `data/devices.json` holds 135 readings.
- `data/schema.json` sets `additionalProperties: false` on its objects, so a field a round adds is
  a schema change.
- `worker/tools.ts` takes a device id and a runtime as free strings and checks them against the
  dataset, so a new device reaches the five MCP tools with no change to a tool. `get_device` and
  `compare_devices` build their output schemas from `data/schema.json`'s `$defs` (`withDefs`).
- `tests/skill.test.ts` recomputes every number `SKILL.md` quotes. Five of its claims hold over
  every reading of a kind, so each device a round adds is checked against them: the tab bar of
  every iPhone from iOS 26.5; the top inset and status bar of every iPhone in landscape; the window
  size classes of every Android reading, which the claim states for Android 16; the size classes of
  every iPad reading, stated for full-screen iPads; and the fold of every foldable reading.
- The repository has no `mcp-registry` environment and no `mcp-v*` tag, so the MCP Registry lists
  no version of the server yet (spec 002 §4.4).

---

## 2. The rounds

| round | adds | how |
| --- | --- | --- |
| R1 | the component readings of §1.1, as `components` in the dataset, `/data/v1/components.json` and a `/components` page | export only; no new run |
| R2 | the 25 iPhones of §1.2, in portrait and landscape; landscape for the devices spec 001 §1.2 has in portrait only | the iOS probe, on the newest release runtime that runs each device |
| R3 | the 25 iPads of §1.2, in both orientations; the iPad tab bar at the top; Split View and Stage Manager window sizes on the iPad Pro 11-inch and 13-inch (M5) | the iOS probe, with the windows set by the simulator |
| R4 | the Android profiles of §1.3 from `pixel_6` on, and the three generic profiles, in rotations 0 to 3; the folds and postures of `pixel_10_pro_fold` | `adb` and the Compose probe, one AVD per profile |
| R5 | the Dynamic Island's and the notch's frames on every iPhone; the cutout rectangles on every Android profile | screenshots with the display mask on iOS, checked first on one device; `dumpsys display` on Android |
| R6 | keyboard heights per device and orientation, for the keyboards of D4 | the probe reads the keyboard's frame on iOS and the `ime` insets on Android |
| R7 | withdrawn 2026-11-17: it planned the iPhone X, 8, 8 Plus, 7, 7 Plus, SE (1st generation), 6s and 6s Plus on the iOS 15–17 runtimes, below the iOS 18 floor (§8.2) | — |
| R8 | every device again on each new OS release: iOS 27.3 and later, the next Android API level | the same tools; spec 001 §2.2 picks the new `current` |

Spec 002's tools return the devices of R2 to R4 and R8 with no change (§1.5). R5 and R6 add fields,
which changes two tools' output schemas (§3.1). R1's components need a tool of their own, which spec 002
specifies before R1 is built (D5).

### 2.1 The devices and runtimes of R2 to R4

From `xcrun simctl list runtimes -j` and `avdmanager list device -c` on this Mac, 2026-11-19. The
newest release runtime is iOS 27.2 (24B8117); 27.3 (24C5037i) is a beta. Each device is measured
on the newest release runtime whose supported device types list it (D2).

**R2, 25 iPhones:**

- on iOS 27.2: the iPhone 11, 11 Pro, 11 Pro Max, SE (2nd generation), 12 mini, 12, 12 Pro,
  12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, 14, 14 Plus, 14 Pro, 14 Pro Max, 15, 15 Plus,
  15 Pro, 15 Pro Max, 16 Plus and 16 Pro;
- on iOS 18.6 (22G86), the only runtime that lists them: the iPhone XS, XS Max and XR.

R2 also reads the five iPhones spec 001 §1.2 has in portrait only, the 16 Pro Max, 17 Pro, 17e,
18 Pro and 18 Pro Max, in both orientations on iOS 27.2. That includes the iPhone 17 Pro's 27.2
reading, which the export left out because its run recorded no build (spec 001 §1.2).

**R3, 25 iPads:**

- on iOS 27.2: the iPad (9th and 10th generation); iPad Air (4th and 5th generation); iPad Air
  11-inch and 13-inch (M2, M3 and M4); iPad Pro 11-inch (2nd to 4th generation) and 12.9-inch (4th
  to 6th); iPad Pro 11-inch (M4) and 13-inch (M4); iPad mini (6th generation);
- on iOS 26.5 (23F77): the iPad (8th generation), iPad Air (3rd generation), iPad Pro 11-inch
  (1st generation), iPad Pro 12.9-inch (3rd generation) and iPad mini (5th generation);
- on iOS 18.6: the iPad (7th generation).

The simulator lists a 16 GB variant of six iPad Pro models as a device type of its own. §1.2 and
this list count each pair once.

**R4, 20 Android profiles**, on `android-36` with Google APIs (`arm64-v8a`), the only system image
installed: `pixel_6`, `pixel_6_pro`, `pixel_6a`, `pixel_7`, `pixel_7_pro`, `pixel_7a`,
`pixel_8_pro`, `pixel_8a`, `pixel_9`, `pixel_9_pro`, `pixel_9_pro_xl`, `pixel_9a`, `pixel_10`,
`pixel_10_pro`, `pixel_10_pro_xl`, `pixel_10a`, `pixel_10_pro_fold` (with its folds and postures),
`medium_phone`, `small_tablet` and `medium_tablet`. No round measures the other 13 profiles of
§1.3: `pixel`, `pixel_xl`, `pixel_2`, `pixel_2_xl`, `pixel_3`, `pixel_3_xl`, `pixel_3a`,
`pixel_3a_xl`, `pixel_4`, `pixel_4_xl`, `pixel_4a`, `pixel_5` and `pixel_c` (D6).

---

## 3. How a round lands

1. The round's runs happen in the private measurement repository (E1), which holds the probes
   (spec 001 §10.5). A round that needs a probe extended, such as R6, changes the probe there. A
   run creates each simulator or AVD it needs once, keeps it for the whole round, and deletes it
   when the round ends. It leaves alone every simulator and AVD it did not create.
2. The exporter (spec 001 §2.5) writes `data/devices.json` into a checkout of this repository and
   prints the counts of devices, runtimes and readings.
3. `npm run check:data` passes, including spec 001 §2.3's comparison of readings two sources hold.
4. One commit in this repository, on a branch named `003-data-rounds` and merged through a pull
   request (AGENTS.md, "Git and pull requests"): the export, `version` raised by a minor step, a
   `data/CHANGELOG.md` entry that lists the devices and runtimes added and quotes the exporter's
   counts, and the skill's `references/devices.md` regenerated by `npm run gen:skill` with the
   plugin's patch version raised (spec 002 §4.1). The commit message quotes the exporter's counts.
   `npm run check`, `npm run build`, `npm test` and `scripts/check-skills.sh` pass on it, with the
   changes §3.1 names.
5. The deploy workflow runs on the merge's push to `main` (spec 001 §5.2), and
   `/data/v1/version.json` shows the new version.
6. The docs page (spec 001 E1) is updated by hand from the round's data, in its own repository
   (spec 001 §10.4).

### 3.1 Changes a round makes besides the export

- **New devices (R2, R3, R4):** each joins the five claims of `tests/skill.test.ts` that hold over
  every reading of a kind (§1.5). A claim a new device breaks is corrected in `SKILL.md` and in the
  test in the same pull request; the device stays in the dataset. The size-class claim selects
  every iPad reading with a size class, while its sentence describes full-screen iPads: R3, which
  adds Split View and Stage Manager windows, narrows the claim to full-screen readings.
- **A new Android API level (R8):** the size-class claim requires every Android reading to be on
  Android 16, so the first reading on the next level fails it. The round rewrites the claim and its
  sentence in `SKILL.md` for the levels the dataset holds.
- **New fields (R5, R6):** `data/schema.json` gains each field, null with a reason on the readings
  that have no value (spec 001 D5). The device page's tables, its Markdown copy and `/method` gain
  the field and the method that reads it. `get_device`'s and `compare_devices`' output schemas
  change with the schema (§1.5), so `server.json`'s version rises by a minor step, and after the
  merge the tag `mcp-v<version>` publishes it (AGENTS.md, "The MCP server"; spec 002 D10).
  AGENTS.md's sentence "a data round leaves `server.json` alone" holds for R2 to R4 and R8.
- **R1:** adds `/data/v1/components.json`, a `/components` page and a sixth MCP tool. The tool
  raises `server.json` to 1.1.0. `SKILL.md` names the five tools, so it changes too, with the
  plugin's minor version raised (AGENTS.md, "The skill and the plugin").

---

## 4. Checks

- Each round: spec 001 §6's checks pass, and the exporter's counts equal the counts in
  `/data/v1/version.json` after the deploy.
- R2 and R3: each new device's window × scale equals the pixels its device profile gives.
- R5: before the round, one iPhone's island frame read from a screenshot is compared with the
  occlusion strip UIKit reports, to show the method reads the island and not the strip.

---

## 5. Phasing

| phase | what lands | why here |
| --- | --- | --- |
| 1 | `specs/003-data-rounds/spec.md` | the spec opens the series |
| 2 | R1 | needs no simulator time; the site it adds a page and a data file to is live (§1.5); its schema, selection rules, page and tool are written into this spec and spec 002 and reviewed first (D5) |
| 3 | R2 | the probe exists; the rounds run one at a time, in their numeric order (D1) |
| 4 | R3 | after R2 (D1) |
| 5 | R4 | after R3 (D1) |
| 6 | R5 | new fields on every device, once R2 to R4 have added the devices |
| 7 | R6 | needs the probes extended in the private measurement repository |
| 8 onward | R8, once per OS release | recurring; R7 is withdrawn (§8.2) |

Commit subjects carry the prefix `[003-data-rounds]`.

### 5.1 What each phase landed

| phase | landed | departures from the plan |
| --- | --- | --- |
| 1 | `52aa47d`, with specs 001 and 002 | — |

---

## 6. Decisions

**D1 — The rounds run one at a time, in their numeric order**: R1 to R6, then R8 on each release.
A round lands (§3) before the next one starts. R1 comes first: it costs no simulator time, and no
reference site publishes component sizes. R2 and R3 then add the iPhones and iPads, the devices the
reference sites list and disagree about (spec 001 §1.4). The alternative, R4 before R2, would
publish the Android data no other site has two rounds sooner. Decided by the user on 2026-11-17
(§8.1).

**D2 — A new device is measured on the newest release runtime that runs it, not on every runtime.**
Measuring 50 iPhones and iPads on six runtimes would take six times the simulator time. The runtime
differences of spec 001 §1.2 come from the devices already measured on three to five runtimes: the
iPhone SE (3rd generation) and the iPhone 16 (five each), the iPad (A16) (four) and the iPhone 17
(three). R8 measures those four on every new runtime. The cost: a change that affects only one
model on an older runtime goes unseen. The oldest runtime measured is iOS 18 (§8.2).

**D3 — A component reading carries the library version that drew it.** Material 3's app bar heights
come from the `material3` release, not from the device: `NavigationBar` reads 80 dp from
`material3` 1.3.2 and 1.4.0. Each Android component reading names its `material3` version; each iOS
component reading names its runtime.

**D4 — R6 measures three keyboards on iOS and two on Android.**

- iOS: the default keyboard (`UIKeyboardType.default`) with its suggestion bar, which the simulator
  shows once its hardware keyboard is disconnected; the number pad (`.numberPad`); and on each iPad,
  the shortcuts bar iPadOS shows at the bottom edge while a hardware keyboard is connected.
- Android: the system image's default input method, for a text field (`KeyboardType.Text`) and a
  number field (`KeyboardType.Number`).

The default keyboard without its suggestion bar is left out: the bar is on unless the user turns
predictive text off, and a layout that fits above the taller keyboard also fits above the shorter
one. The cost: the dataset has no height for a user who turned predictive text off. Decided by the
user on 2026-11-17, who took this recommendation (§8.4).

**D5 — R1's design is written into the specs and reviewed before R1 is built.** This spec gains the
fields that identify a component reading, the shape of `/data/v1/components.json`, the rule that
selects each published value from the records of §1.1, and the `/components` page. Spec 002 gains
the sixth MCP tool's name, arguments and output schema. `/data/v1/` is public and versioned, so a
published shape changes only with a major version and `/data/v2/` (spec 001 §2.4). Building R1 and
recording the choices in §5.1 afterwards was the alternative; it would publish a shape no one had
reviewed. The cost: a review before R1's export. Decided by the user on 2026-11-23 (§8.5).

**D6 — No round measures the 13 Pixel profiles older than `pixel_6`.** Google lists the phones of
twelve of them, from the Pixel and Pixel XL to the Pixel 5, among the Pixel phones that no longer
receive Android version updates (E2). The thirteenth, `pixel_c`, is a tablet whose last version is
Android 8.1 (E3). The only system image installed is Android 16 (§1.3), which Google does not ship
to any of them, so their readings would describe a device and version pair Google does not ship.
Measuring each profile on its last Android version was the alternative; it needs an older system
image per profile. The cost: no readings for these devices, which some people still use. Decided
by the user on 2026-11-23 (§8.6).

---

## 7. Non-goals

- Physical devices. Every reading comes from a simulator or an emulator.
- Every device on every runtime (D2).
- Runtimes below iOS 18, and the devices that need one (§8.2).
- Android devices from other manufacturers (§8.3).
- The 13 Pixel profiles older than `pixel_6` (D6).
- Display Zoom on iOS, and Android at a font scale other than 1: non-goals as of 2026-11-23, by the
  user's answer to §8.6. A later spec can add a round for them.

---

## 8. Open questions

**8.1 — Does R2 come right after R1?** The alternative is R4 first, for the Android data no other
site has. Needs an answer before phase 3.

*Answered 2026-11-17:* the rounds run one at a time, in their numeric order (D1).

**8.2 — Download the iOS 15–17 runtimes for R7?** Each runtime takes several gigabytes, and
whether this Mac's Xcode runs them is not measured (§1.4). Needs an answer before phase 8.

*Answered 2026-11-17:* no. The floor is iOS 18, and R7 is withdrawn (§2, §7).

**8.3 — Add other manufacturers' Android devices?** Some manufacturers publish emulator profiles for
their phones. Needs an answer before phase 4.

*Answered 2026-11-17:* no. The dataset holds Google's emulator profiles only (§7).

**8.4 — Which keyboards does R6 measure?** The default keyboard with and without the suggestion
bar, a numeric pad, and the hardware keyboard's accessory bar each have their own height. Needs an
answer before phase 7.

*Answered 2026-11-17:* as recommended: the default keyboard with its suggestion bar, the number pad
and the iPad's hardware-keyboard shortcuts bar on iOS; the text and number input on Android (D4).

**8.5 — Write R1's design into the specs before building it?** Neither spec defines what R1
publishes: the fields that identify a component reading (device, runtime, orientation, appearance,
text size, and on Android the `material3` version of D3), the shape of
`/data/v1/components.json`, the `/components` page, and the sixth MCP tool's name, arguments and
output schema. The readings of §1.1 hold several records per value, so each published value needs
a rule: which conditions get rows of their own, which collapse to one value, and which records are
dropped. R1 also extends the exporter in the private measurement repository. Proposed: write the
schema, the selection rules, the page and the tool into this spec and spec 002 for review before
the build, because `/data/v1/` is a public, versioned path, and a published shape changes only with
a major version and `/data/v2/` (`data/CHANGELOG.md`). The alternative is to build R1 and record
the choices in §5.1. Asked on 2026-11-18; needs an answer before phase 2.

*Answered 2026-11-23:* as proposed. The schema, the selection rules, the page and the tool are
written into this spec and spec 002 for review before the build (D5).

**8.6 — Measure what no round plans?** No round measures the 13 older Pixel profiles of §2.1,
Display Zoom, or Android at a font scale other than 1 (§1.4). No decision records why R4 starts at
`pixel_6`. Needs an answer before phase 5 (R4) for the Pixels, and before phase 7 (R6), the last
round that extends a probe, for the other two. Raised 2026-11-19.

*Answered 2026-11-23:* no round measures the 13 older Pixel profiles, for the reason D6 records.
Display Zoom and Android font scales other than 1 are non-goals for now (§7).

---

## 9. External references

| id | reference | public | URL and pin | cited in |
| --- | --- | --- | --- | --- |
| E1 | *Redacted:* Modaal's device measurement runs and their run notes, inventoried 2026-11-17 (the same source as spec 001's E13) | no | — | §1.1, §3 |
| E2 | Google Pixel Phone Help, "Learn when you'll get software updates on Google Pixel phones" | yes | https://support.google.com/pixelphone/answer/4457705; unversioned, read 2026-11-23 | D6 |
| E3 | Wikipedia, "Pixel C" | yes | https://en.wikipedia.org/wiki/Pixel_C; unversioned, read 2026-11-23 | D6 |
