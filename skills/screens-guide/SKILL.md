---
name: screens-guide
description: Measured screen sizes, safe-area insets, display corner radii, status, navigation and tab bars, size classes and folds of iPhones, iPads and Android phones, tablets and foldables, read on Xcode simulators and Android emulators. Use when laying out, reviewing or testing a mobile screen in SwiftUI, UIKit, Jetpack Compose or Android views; when choosing padding, a corner radius or where a bottom bar or toolbar goes; when converting between pt, dp and px; when asked how tall a device's status bar, home indicator area, tab bar or navigation bar is or how big its safe area is; or when adapting a layout to landscape, an iPad, a notch or Dynamic Island, a foldable's hinge or a window size class.
license: MIT
---

# Screen measurements for iOS and Android layouts

screens.guide reads each device on an Xcode simulator or an Android emulator with a probe app:
the window, the safe-area insets, the display's corner radius, the system bars, the size class and
the fold. Every number below names the device and the runtime it was read on. Use the measured
numbers instead of numbers recalled from design guidelines or spec sheets, which differ by device,
runtime and orientation.

## Get the numbers

Take the first source that is available:

1. **The MCP server `screens-guide`** (https://screens.guide/mcp), when its tools are connected:
   `list_devices` for the ids, `get_device` for one device's readings, `compare_devices` for
   several side by side, `check_layout` to check frames against a device, `convert_units` between
   pt or dp and px. It has every runtime the dataset holds.
2. **The files**, when the network is available: https://screens.guide/data/v1/devices/<id>.json
   for one device (for example `iphone-17`), https://screens.guide/data/v1/devices.json for all,
   and https://screens.guide/devices/<id>.md for a device's page as Markdown.
3. **[references/devices.md](references/devices.md)**, which this skill carries: each device's
   current readings on the date the file states. Tell the user that date when you quote from it.

How to read any of them:

- Lengths are in the device's unit: points (pt) on iOS, density-independent pixels (dp) on
  Android. px are physical pixels.
- Positions are window coordinates from the window's top left, already rotated for the reading's
  orientation. Insets are given as top / bottom / left / right.
- A value no run measured is null, with its reason. Never fill it from another device, a similar
  model or a spec sheet; say it was not measured.
- Credit the numbers as "screens.guide, measured by Modaal" when they go into a document.

## Rules the measurements support

### Corner radii: concentric corners

The display's rounded corners clip whatever is drawn under them.

- The iPhone 17 on iOS 27.0 has a display corner radius of 62 pt.
- A card 16 pt from the side and bottom edges needs a corner radius of 62 − 16 = 46 pt to keep an
  even 16 pt gap along the curve. In general the concentric radius is the display radius minus the
  larger of the frame's two distances from the edges, and never below 0.
- A square corner 16 pt from both edges lies 3.05 pt outside the display's curve: the display cuts
  it off. 16 pt from the side and 34 pt from the bottom, on the safe area's edge, it lies 8.15 pt
  inside.
- The arithmetic, for a frame corner `dx` and `dy` from the two edges of a corner of radius `R`:
  when both are below `R`, the corner lies `R − √((R − dx)² + (R − dy)²)` inside the curve, and
  outside it when that is negative.
- iPads have smaller radii: 25 pt on the iPad (A16), 30 pt on the iPad Pro 11-inch (M5), both on
  iOS 27.0. The iPhone SE (3rd generation) has square corners. On Android the four corners can
  differ: the Pixel 8 on Android 16 has 39.62 dp at the top and 38.86 dp at the bottom.

### iOS: the tab bar floats at a fixed distance from the bottom edge

- From iOS 26.5, every iPhone measured draws the tab bar as a capsule 62 pt tall whose bottom edge
  is 21 pt above the window's bottom edge in portrait, and 44 pt tall and 20 pt above in landscape.
- The distance does not follow the safe area: it is 21 pt on the iPhone 17, whose bottom inset is
  34 pt, and on the iPhone SE (3rd generation), whose bottom inset is 0, both on iOS 27.0.
- Place content and floating buttons above the tab bar by the bar's frame, 83 pt from the bottom
  edge in portrait, not by the bottom safe-area inset.
- On iOS 18.6 the tab bar is a full-width bar at the bottom edge: 83 pt tall on the iPhone 16, which
  includes its 34 pt bottom inset, and 49 pt on the iPhone SE (3rd generation). An app that supports
  both runtimes gets both shapes.

### iOS: landscape iPhones hide the status bar

- Every iPhone reading in landscape has a top inset of 0, and each one that read the status bar
  reports it hidden.
- The iPhone 17 on iOS 27.0 has insets 62 / 34 / 0 / 0 in portrait and 0 / 20 / 62 / 62 in
  landscape: the 62 pt side insets keep content clear of the Dynamic Island on whichever side it is.
- iPads keep the status bar at the top in both orientations: on the iPad (A16) on iOS 27.0 it is
  32 pt tall, and the insets are 32 / 20 / 0 / 0 either way.
- The inline navigation bar is 54 pt tall from the top inset, and a large-title bar 106 pt, on the
  iPhone 17 on iOS 27.0.

### Android: dp are fractional

- One dp is dpi ÷ 160 pixels. The Pixel 8 on Android 16 has 420 dpi, so 2.625 px per dp: its window
  is 411.43 × 914.29 dp and its status bar inset is 50.29 dp.
- Expect fractions in Android measurements and compare them with a tolerance of 0.01 dp.
- Compose's `Dp.roundToPx()` rounds to whole pixels: 16 dp is 42 px on the Pixel 8.
  `convert_units` gives both the exact value and the rounded one.

### Android: the navigation bar sits above the bottom inset

- On the Pixel 8 on Android 16, Material 3's navigation bar is 104 dp tall at the window's bottom
  edge: 80 dp of bar above the 24 dp gesture-navigation inset. Its background runs to the edge and
  its items stay above the inset.
- Material 3's top app bar is 64 dp tall, below the 50.29 dp status bar inset in portrait.
- The safe area is `WindowInsets.safeDrawing`, and it changes with each of the four rotations. On the
  Pixel 8 the camera cutout moves: insets 50.29 / 24 / 0 / 0 at rotation 0, 28.19 / 24 / 50.29 / 0
  at 90, 28.19 / 50.29 / 0 / 0 at 180, 28.19 / 24 / 0 / 50.29 at 270.

### Window size classes

- Android's window size classes (`currentWindowAdaptiveInfo`): width compact below 600 dp, medium
  from 600 dp, expanded from 840 dp; height compact below 480 dp, medium from 480 dp, expanded from
  900 dp. Every Android reading in the dataset, on Android 16, falls in the class these thresholds
  give.
- The thresholds split one device by orientation and pose: the Pixel 8 is compact wide in portrait
  (411.43 dp) and expanded in landscape (914.29 dp); the Pixel Fold is medium closed in landscape
  (796.95 dp), expanded open in landscape (841.14 dp) and medium open in portrait (700.95 dp).
- `currentWindowAdaptiveInfoV2` adds a large width class from 1200 dp: the Pixel Tablet in landscape,
  1280 dp wide, is large there and expanded in the first version.
- iOS: iPhones are compact wide in portrait. In landscape, the iPhone 17 Pro Max on iOS 26.5 and the
  iPhone Air on iOS 27.0, 956 and 912 pt wide, are regular wide; the iPhone 17 on iOS 27.0, 874 pt
  wide, stays compact. Full-screen iPads are regular in both directions.

### Foldables: the fold and the second screen

- A foldable has a screen per pose: closed (the cover screen), open flat, half open and, on some,
  tent. Each pose has its own window size, insets and size class.
- The Pixel Fold on Android 16, open in landscape, is 841.14 × 700.95 dp, with a vertical fold line
  of width 0 at x 420.57 dp. The Pixel 9 Pro Fold's is at x 425.85 dp of 851.69 dp.
- The hinge separates the screen into two halves when half open and does not when flat. Put no text
  or control across the fold when it separates.
- The iPhone Duo on iOS 27.1 has a fold band 40 pt tall: from y 455.5 pt to 495.5 pt of its
  669 × 951 pt window in portrait, and 40 pt wide at x 455.5 pt in landscape. It also reports
  occlusion regions, such as the camera at 535, 0, 134 × 82 pt in portrait, open.

## Review a screen against a device

1. Choose the devices: the smallest and the largest phone of each platform the app supports, an
   iPad or tablet if it runs there, and a foldable if it supports one. `list_devices` or the
   devices table names them.
2. Write down the frames of the screen's elements in window coordinates, in the device's unit, with
   the corner radius of each rounded one.
3. With the MCP server, call `check_layout` with the device, the screen for a foldable, the
   orientation or rotation, and the frames. It reports, per frame: `outside-window`, `in-inset`,
   `cut-by-corner` with the depth, `near-corner` with the gap and the concentric radius,
   `under-system-bar`, `crosses-fold` and `in-occlusion-region`.
4. Without it, check the same against [references/devices.md](references/devices.md) with the
   corner arithmetic above.
5. Repeat in landscape, and on Android at each rotation the app allows: the insets and bars change.
6. Report each finding with its number, the device and the runtime, and the change that fixes it.
