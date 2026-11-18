# Dataset changelog

One entry per version of `data/devices.json`. A major version changes the schema incompatibly and
gets a new data path (`/data/v2/`); a minor version adds devices, runtimes or fields; a patch
corrects values.

## 1.0.0 — 2026-11-17

The first export: 22 devices, 10 runtime builds, 135 readings, measured on Xcode simulators and
Android emulators between 2026-10-14 and 2026-11-09.

- iOS: the iPhone SE (3rd generation), 16e, 16, 16 Pro Max, 17, 17 Pro, 17 Pro Max, 17e, Air,
  18 Pro, 18 Pro Max and Duo; the iPad mini (A17 Pro), iPad mini (A20 Pro), iPad (A16), iPad Pro
  11-inch (M5) and iPad Pro 13-inch (M5). Runtimes 18.6 (22G86), 26.5 (23F77), 27.0 (24A434),
  27.1 (24A94232, 24A94425), 27.2 (24B8117; betas 24B5089g and 24B91016s) and 27.3 beta
  (24C5037i).
- Android 16 (API 36, BE2A.250530.026.F3): a small phone of 360 × 780 dp, the Pixel 8, Pixel
  Fold, Pixel 9 Pro Fold and Pixel Tablet.
