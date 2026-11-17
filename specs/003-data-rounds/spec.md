# 003 — Data rounds: the recorded component readings, then more devices

**Status:** Written 2026-11-17, revised in place the same day with spec 001's answer on the probes
(spec 001 §10.5) and the answers to §8.1 to §8.4. Not implemented. **Baseline:** `main` at
`77f08eb`. **Obsoletes:** nothing.

**Relates to:**

- spec 001 §1.2 — the 22 devices and the runtimes the launch dataset holds.
- spec 001 §2 — the dataset each round adds to, its rules and its versioning.
- spec 002 §2.2 — the MCP tools, which read whatever the dataset holds.
- §9 — every external reference this spec makes.

---

## 0. TL;DR

1. **The launch dataset holds 22 devices; this Mac's simulators and emulators can run 50 more
   iPhones and iPads and 33 more Android profiles** (§1.2, §1.3).
2. **The runs have also recorded system components that spec 001 does not publish**: sheets,
   alerts, menus and rows on iOS; Material 3's app bars, floating action button, snackbar, dialog and
   sheet on Android (§1.1).
3. **Seven rounds, run one at a time in their numeric order.** R1 publishes the recorded
   components with no new run. R2 to R6 measure more devices and new fields. R8 repeats the
   measurements on each new OS release. R7 is withdrawn: the floor is iOS 18 (§2, D1, §8.2).
4. **Each round lands in this repository as one commit**: the export, a minor dataset version and
   its changelog entry (§3).
5. **The probes stay in the private measurement repository** (spec 001 §10.5). A round that
   extends a probe changes it there, and this repository receives only the export (§3).
6. **All four questions are answered** (§8). R6 measures the default keyboard, the number pad and
   the iPad's hardware-keyboard bar (D4).

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

Spec 002's tools return a round's devices with no change. R1's components need a tool of their own,
added to spec 002 when R1 lands.

---

## 3. How a round lands

1. The round's runs happen in the private measurement repository (E1), which holds the probes
   (spec 001 §10.5). A round that needs a probe extended, such as R6, changes the probe there. A
   run creates each simulator or AVD it needs once, keeps it for the whole round, and deletes it
   when the round ends.
2. The exporter (spec 001 §2.5) writes `data/devices.json` into a checkout of this repository and
   prints the counts of devices, runtimes and readings.
3. `npm run check:data` passes, including spec 001 §2.3's comparison of readings two sources hold.
4. One commit in this repository: the export, `version` raised by a minor step, a
   `data/CHANGELOG.md` entry that lists the devices and runtimes added and quotes the exporter's
   counts, and the skill's `references/devices.md` regenerated with the plugin's patch version
   raised (spec 002 §4.1).
5. The deploy of spec 001 §5.2 publishes it, and `/data/v1/version.json` shows the new version.

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
| 2 | R1 | needs no simulator time; needs spec 001's site (its phase 5) for the page and data file |
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

---

## 7. Non-goals

- Physical devices. Every reading comes from a simulator or an emulator.
- Every device on every runtime (D2).
- Runtimes below iOS 18, and the devices that need one (§8.2).
- Android devices from other manufacturers (§8.3).

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

---

## 9. External references

| id | reference | public | URL and pin | cited in |
| --- | --- | --- | --- | --- |
| E1 | *Redacted:* Modaal's device measurement runs and their run notes, inventoried 2026-11-17 (the same source as spec 001's E13) | no | — | §1.1, §3 |
