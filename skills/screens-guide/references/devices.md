# Device readings

Dataset 1.0.0 of 2026-11-17 from https://screens.guide, licensed CC BY 4.0: credit "screens.guide, measured by Modaal". This file is a snapshot of that date. When the MCP server or the network is available, `get_device` or https://screens.guide/data/v1/devices/<id>.json gives the same readings, every runtime, and the values listed here as missing.

Each row is one device's current runtime, one screen and one rotation. Lengths are in the device's unit, pt on iOS and dp on Android; px are physical pixels. Positions are window coordinates from the window's top left. A dash is a value no run measured; the online data gives the reason.

- **insets**: the safe-area insets.
- **corner**: the display's corner radius; four values run top left, top right, bottom right, bottom left.
- **status bar**: its placement and height.
- **top bar**: the navigation bar (iOS, inline title) or Material 3 top app bar (Android): its top edge + its height.
- **bottom bar**: the tab bar (iOS) or Material 3 navigation bar (Android): its style and height, and its gap to the window's bottom edge. A height includes the bottom inset when the gap is 0.
- **size class**: iOS horizontal / vertical size class; Android window width / height size class.

## Devices

| device | id | runtime | build | scale |
| --- | --- | --- | --- | --- |
| iPhone SE (3rd generation) | `iphone-se-3` | iOS 27.2 | `24B8117` | 2 px per pt |
| iPhone 16e | `iphone-16e` | iOS 27.0 | `24A434` | 3 px per pt |
| iPhone 16 | `iphone-16` | iOS 27.2 | `24B8117` | 3 px per pt |
| iPhone 16 Pro Max | `iphone-16-pro-max` | iOS 18.6 | `22G86` | 3 px per pt |
| iPhone 17 | `iphone-17` | iOS 27.0 | `24A434` | 3 px per pt |
| iPhone 17 Pro | `iphone-17-pro` | iOS 27.0 | `24A434` | 3 px per pt |
| iPhone 17 Pro Max | `iphone-17-pro-max` | iOS 26.5 | `23F77` | 3 px per pt |
| iPhone 17e | `iphone-17e` | iOS 27.2 | `24B8117` | 3 px per pt |
| iPhone Air | `iphone-air` | iOS 27.0 | `24A434` | 3 px per pt |
| iPhone 18 Pro | `iphone-18-pro` | iOS 27.2 | `24B8117` | 3 px per pt |
| iPhone 18 Pro Max | `iphone-18-pro-max` | iOS 27.2 | `24B8117` | 3 px per pt |
| iPhone Duo | `iphone-duo` | iOS 27.1 | `24A94232` | 3 px per pt |
| iPad mini (A17 Pro) | `ipad-mini-a17-pro` | iOS 27.0 | `24A434` | 2 px per pt |
| iPad mini (A20 Pro) | `ipad-mini-a20-pro` | iOS 27.2 | `24B8117` | 2 px per pt |
| iPad (A16) | `ipad-a16` | iOS 27.0 | `24A434` | 2 px per pt |
| iPad Pro 11-inch (M5) | `ipad-pro-11-m5` | iOS 27.0 | `24A434` | 2 px per pt |
| iPad Pro 13-inch (M5) | `ipad-pro-13-m5` | iOS 27.0 | `24A434` | 2 px per pt |
| Small Android phone (360 × 780 dp) | `android-small-phone` | Android 16 (API 36) | `BE2A.250530.026.F3` | 3 px per dp (480 dpi) |
| Pixel 8 | `pixel-8` | Android 16 (API 36) | `BE2A.250530.026.F3` | 2.625 px per dp (420 dpi) |
| Pixel Fold | `pixel-fold` | Android 16 (API 36) | `BE2A.250530.026.F3` | 2.625 px per dp (420 dpi) |
| Pixel 9 Pro Fold | `pixel-9-pro-fold` | Android 16 (API 36) | `BE2A.250530.026.F3` | 2.4375 px per dp (390 dpi) |
| Pixel Tablet | `pixel-tablet` | Android 16 (API 36) | `BE2A.250530.026.F3` | 2 px per dp (320 dpi) |

## iOS

| device | screen | rotation | window | insets t / b / l / r | corner | status bar | top bar | bottom bar | size class w / h |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `iphone-se-3` | main | 0 | 375 × 667 | 20 / 0 / 0 / 0 | 0 | top 20 | 20 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-se-3` | main | 90 | 667 × 375 | 0 / 0 / 0 / 0 | 0 | hidden | 24 + 54 | capsule 44, 20 above bottom | compact / compact |
| `iphone-16e` | main | 0 | 390 × 844 | 47 / 34 / 0 / 0 | 47.33 | top 47 | 47 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-16e` | main | 90 | 844 × 390 | 0 / 20 / 47 / 47 | 47.33 | hidden | 24 + 54 | capsule 44, 20 above bottom | compact / compact |
| `iphone-16` | main | 0 | 393 × 852 | 59 / 34 / 0 / 0 | 55 | top 54 | 59 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-16` | main | 90 | 852 × 393 | 0 / 20 / 59 / 59 | 55 | hidden | 24 + 54 | capsule 44, 20 above bottom | compact / compact |
| `iphone-16-pro-max` | main | 0 | 440 × 956 | 62 / 34 / 0 / 0 | 62 | top 54 | 56.33 + 44 | bar 83, 0 above bottom | compact / regular |
| `iphone-17` | main | 0 | 402 × 874 | 62 / 34 / 0 / 0 | 62 | top 54 | 62 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-17` | main | 90 | 874 × 402 | 0 / 20 / 62 / 62 | 62 | hidden | 24 + 54 | capsule 44, 20 above bottom | compact / compact |
| `iphone-17-pro` | main | 0 | 402 × 874 | 62 / 34 / 0 / 0 | 62 | top 54 | 62 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-17-pro-max` | main | 0 | 440 × 956 | 62 / 34 / 0 / 0 | 62 | top 54 | 62 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-17-pro-max` | main | 90 | 956 × 440 | 0 / 20 / 62 / 62 | 62 | hidden | 24 + 54 | capsule 44, 20 above bottom | regular / compact |
| `iphone-17e` | main | 0 | 390 × 844 | 47 / 34 / 0 / 0 | 47.33 | top 47 | 47 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-air` | main | 0 | 420 × 912 | 68 / 34 / 0 / 0 | 62 | top 54 | 68 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-air` | main | 90 | 912 × 420 | 0 / 20 / 68 / 68 | 62 | hidden | 24 + 54 | capsule 44, 20 above bottom | regular / compact |
| `iphone-18-pro` | main | 0 | 402 × 874 | 62 / 34 / 0 / 0 | 62 | top 54 | 62 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-18-pro-max` | main | 0 | 440 × 956 | 62 / 34 / 0 / 0 | 62 | top 54 | 62 + 54 | capsule 62, 21 above bottom | compact / regular |
| `iphone-duo` | closed | 0 | 466 × 678 | 0 / 34 / 0 / 84 | 8, 59, 59, 8 | — | — | — | compact / regular |
| `iphone-duo` | closed | 90 | 678 × 466 | 0 / 34 / 84 / 0 | 59, 59, 8, 8 | — | — | — | — |
| `iphone-duo` | closed | 270 | 678 × 466 | 0 / 34 / 0 / 84 | 8, 8, 59, 59 | — | — | — | compact / compact |
| `iphone-duo` | open | 0 | 669 × 951 | 82 / 34 / 0 / 0 | 55 | — | — | — | — |
| `iphone-duo` | open | 90 | 951 × 669 | 0 / 34 / 0 / 84 | 55 | — | — | — | — |
| `iphone-duo` | open | 180 | 669 × 951 | 82 / 34 / 0 / 0 | 55 | — | — | — | — |
| `iphone-duo` | open | 270 | 951 × 669 | 0 / 34 / 0 / 84 | 55 | — | — | — | — |
| `iphone-duo` | half-open | 0 | 669 × 951 | 82 / 34 / 0 / 0 | 55 | — | — | — | — |
| `iphone-duo` | half-open | 90 | 951 × 669 | 0 / 34 / 0 / 84 | 55 | — | — | — | — |
| `iphone-duo` | half-open | 180 | 669 × 951 | 82 / 34 / 0 / 0 | 55 | — | — | — | regular / regular |
| `iphone-duo` | half-open | 270 | 951 × 669 | 0 / 34 / 0 / 84 | 55 | — | — | — | regular / regular |
| `iphone-duo` | tent | 0 | 466 × 678 | 0 / 34 / 0 / 84 | 8, 59, 59, 8 | — | — | — | compact / regular |
| `iphone-duo` | tent | 90 | 678 × 466 | 0 / 34 / 84 / 0 | 59, 59, 8, 8 | — | — | — | compact / compact |
| `iphone-duo` | tent | 270 | 678 × 466 | 0 / 34 / 0 / 84 | 8, 8, 59, 59 | — | — | — | compact / compact |
| `ipad-mini-a17-pro` | main | 0 | 744 × 1133 | 32 / 20 / 0 / 0 | 21.5 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-mini-a17-pro` | main | 90 | 1133 × 744 | 32 / 20 / 0 / 0 | 21.5 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-mini-a20-pro` | main | 0 | 756 × 1158 | 32 / 20 / 0 / 0 | 47 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-a16` | main | 0 | 820 × 1180 | 32 / 20 / 0 / 0 | 25 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-a16` | main | 90 | 1180 × 820 | 32 / 20 / 0 / 0 | 25 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-pro-11-m5` | main | 0 | 834 × 1210 | 32 / 20 / 0 / 0 | 30 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-pro-11-m5` | main | 90 | 1210 × 834 | 32 / 20 / 0 / 0 | 30 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-pro-13-m5` | main | 0 | 1032 × 1376 | 32 / 20 / 0 / 0 | 30 | top 32 | 32 + 54 | — | regular / regular |
| `ipad-pro-13-m5` | main | 90 | 1376 × 1032 | 32 / 20 / 0 / 0 | 30 | top 32 | 32 + 54 | — | regular / regular |

## Android

| device | screen | rotation | window | insets t / b / l / r | corner | status bar | top bar | bottom bar | size class w / h |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `android-small-phone` | main | 0 | 360 × 780 | 45.33 / 24 / 0 / 0 | — | top 45.33 | — | — | — |
| `android-small-phone` | main | 90 | 780 × 360 | 24 / 24 / 45.33 / 0 | — | top 24 | — | — | — |
| `pixel-8` | main | 0 | 411.43 × 914.29 | 50.29 / 24 / 0 / 0 | 39.62, 39.62, 38.86, 38.86 | top 50.29 | 50.29 + 64 | bar 104, 0 above bottom | compact / expanded |
| `pixel-8` | main | 90 | 914.29 × 411.43 | 28.19 / 24 / 50.29 / 0 | 39.62, 38.86, 38.86, 39.62 | top 28.19 | 28.19 + 64 | bar 104, 0 above bottom | expanded / compact |
| `pixel-8` | main | 180 | 411.43 × 914.29 | 28.19 / 50.29 / 0 / 0 | 38.86, 38.86, 39.62, 39.62 | — | 28.19 + 64 | — | compact / expanded |
| `pixel-8` | main | 270 | 914.29 × 411.43 | 28.19 / 24 / 0 / 50.29 | 38.86, 39.62, 39.62, 38.86 | — | 28.19 + 64 | — | expanded / compact |
| `pixel-fold` | closed | 0 | 411.43 × 796.95 | 41.9 / 24 / 0 / 0 | — | top 41.9 | 41.9 + 64 | — | compact / medium |
| `pixel-fold` | closed | 90 | 796.95 × 411.43 | 28.19 / 24 / 41.9 / 0 | — | top 28.19 | 28.19 + 64 | — | medium / compact |
| `pixel-fold` | closed | 180 | 411.43 × 796.95 | 28.19 / 41.9 / 0 / 0 | — | — | 28.19 + 64 | — | compact / medium |
| `pixel-fold` | closed | 270 | 796.95 × 411.43 | 28.19 / 24 / 0 / 41.9 | — | — | 28.19 + 64 | — | medium / compact |
| `pixel-fold` | open | 0 | 841.14 × 700.95 | 28.19 / 32 / 0 / 0 | — | top 28.19 | 28.19 + 64 | — | expanded / medium |
| `pixel-fold` | open | 90 | 700.95 × 841.14 | 28.19 / 32 / 0 / 0 | — | top 28.19 | 28.19 + 64 | — | medium / medium |
| `pixel-fold` | open | 180 | 841.14 × 700.95 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | expanded / medium |
| `pixel-fold` | open | 270 | 700.95 × 841.14 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | medium / medium |
| `pixel-fold` | half-open | 0 | 841.14 × 700.95 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | expanded / medium |
| `pixel-fold` | half-open | 90 | 700.95 × 841.14 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | medium / medium |
| `pixel-fold` | half-open | 180 | 841.14 × 700.95 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | expanded / medium |
| `pixel-fold` | half-open | 270 | 700.95 × 841.14 | 28.19 / 32 / 0 / 0 | — | — | 28.19 + 64 | — | medium / medium |
| `pixel-9-pro-fold` | closed | 0 | 443.08 × 994.46 | 62.36 / 24.21 / 0 / 0 | 34.87 | top 62.36 | 62.36 + 64 | — | compact / expanded |
| `pixel-9-pro-fold` | closed | 90 | 994.46 × 443.08 | 52.1 / 24.21 / 62.36 / 0 | 34.87 | top 52.1 | 52.1 + 64 | — | expanded / compact |
| `pixel-9-pro-fold` | closed | 180 | 443.08 × 994.46 | 52.1 / 62.36 / 0 / 0 | 34.87 | — | 52.1 + 64 | — | compact / expanded |
| `pixel-9-pro-fold` | closed | 270 | 994.46 × 443.08 | 52.1 / 24.21 / 0 / 62.36 | 34.87 | — | 52.1 + 64 | — | expanded / compact |
| `pixel-9-pro-fold` | open | 0 | 851.69 × 882.87 | 55.79 / 32 / 0 / 0 | 34.87 | top 55.79 | 55.79 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | open | 90 | 882.87 × 851.69 | 55.79 / 32 / 0 / 0 | 34.87 | top 55.79 | 55.79 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | open | 180 | 851.69 × 882.87 | 36.1 / 55.79 / 0 / 0 | 34.87 | — | 36.1 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | open | 270 | 882.87 × 851.69 | 36.1 / 55.79 / 0 / 0 | 34.87 | — | 36.1 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | half-open | 0 | 851.69 × 882.87 | 55.79 / 32 / 0 / 0 | 34.87 | — | 55.79 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | half-open | 90 | 882.87 × 851.69 | 55.79 / 32 / 0 / 0 | 34.87 | — | 55.79 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | half-open | 180 | 851.69 × 882.87 | 36.1 / 55.79 / 0 / 0 | 34.87 | — | 36.1 + 64 | — | expanded / medium |
| `pixel-9-pro-fold` | half-open | 270 | 882.87 × 851.69 | 36.1 / 55.79 / 0 / 0 | 34.87 | — | 36.1 + 64 | — | expanded / medium |
| `pixel-tablet` | main | 0 | 1280 × 800 | 24 / 32 / 0 / 0 | — | — | 24 + 64 | — | expanded / medium |
| `pixel-tablet` | main | 90 | 800 × 1280 | 24 / 32 / 0 / 0 | — | — | 24 + 64 | — | medium / expanded |
| `pixel-tablet` | main | 180 | 1280 × 800 | 24 / 32 / 0 / 0 | — | — | 24 + 64 | — | expanded / medium |
| `pixel-tablet` | main | 270 | 800 × 1280 | 24 / 32 / 0 / 0 | — | — | 24 + 64 | — | medium / expanded |

## Folds and reserved regions

A fold band of width or height 0 is a line. `separates` is yes when the hinge splits the screen into two halves, as when half open. A reserved region is an area the system reports occluded, such as a camera.

| device | screen | rotation | fold axis | fold band x, y, width, height | separates | reserved regions |
| --- | --- | --- | --- | --- | --- | --- |
| `iphone-duo` | closed | 0 | — | — | — | occlusion 399.67, 29.33, 37, 37; occlusion 382, 0, 84, 170 |
| `iphone-duo` | closed | 90 | — | — | — | occlusion 29.33, 29.33, 37, 37; occlusion 0, 0, 84, 82 |
| `iphone-duo` | closed | 270 | — | — | — | occlusion 611.67, 399.67, 37, 37; occlusion 594, 384, 84, 82 |
| `iphone-duo` | open | 0 | horizontal | 0, 455.5, 669, 40 | no | occlusion 535, 0, 134, 82 |
| `iphone-duo` | open | 90 | vertical | 455.5, 0, 40, 669 | no | occlusion 867, 0, 84, 120 |
| `iphone-duo` | open | 180 | horizontal | 0, 455.5, 669, 40 | no | occlusion 535, 0, 134, 82 |
| `iphone-duo` | open | 270 | vertical | 455.5, 0, 40, 669 | no | occlusion 867, 0, 84, 120 |
| `iphone-duo` | half-open | 0 | horizontal | 0, 455.5, 669, 40 | yes | occlusion 535, 0, 134, 82 |
| `iphone-duo` | half-open | 90 | vertical | 455.5, 0, 40, 669 | yes | occlusion 867, 0, 84, 120 |
| `iphone-duo` | half-open | 180 | horizontal | 0, 455.5, 669, 40 | yes | occlusion (inactive) 611, 677.33, 37, 58; occlusion 535, 0, 134, 82 |
| `iphone-duo` | half-open | 270 | vertical | 455.5, 0, 40, 669 | yes | occlusion (inactive) 677.33, 21, 58, 37; occlusion 867, 0, 84, 120 |
| `iphone-duo` | tent | 0 | — | — | — | occlusion 399.67, 29.33, 37, 37; occlusion 382, 0, 84, 170 |
| `iphone-duo` | tent | 90 | — | — | — | occlusion 29.33, 29.33, 37, 37; occlusion 0, 0, 84, 82 |
| `iphone-duo` | tent | 270 | — | — | — | occlusion 611.67, 399.67, 37, 37; occlusion 594, 384, 84, 82 |
| `android-small-phone` | main | 0 | — | — | — | cutout 0, 0, 45.33, 45.33 |
| `pixel-8` | main | 0 | — | — | — | cutout 182.48, 0, 46.48, 50.29 |
| `pixel-fold` | open | 0 | vertical | 420.57, 0, 0, 700.95 | no | — |
| `pixel-fold` | open | 90 | horizontal | 0, 420.57, 700.95, 0 | no | — |
| `pixel-fold` | open | 180 | vertical | 420.57, 0, 0, 700.95 | no | — |
| `pixel-fold` | open | 270 | horizontal | 0, 420.57, 700.95, 0 | no | — |
| `pixel-fold` | half-open | 0 | vertical | 420.57, 0, 0, 700.95 | yes | — |
| `pixel-fold` | half-open | 90 | horizontal | 0, 420.57, 700.95, 0 | yes | — |
| `pixel-fold` | half-open | 180 | vertical | 420.57, 0, 0, 700.95 | yes | — |
| `pixel-fold` | half-open | 270 | horizontal | 0, 420.57, 700.95, 0 | yes | — |
| `pixel-9-pro-fold` | open | 0 | vertical | 425.85, 0, 0, 882.87 | no | — |
| `pixel-9-pro-fold` | open | 90 | horizontal | 0, 425.85, 882.87, 0 | no | — |
| `pixel-9-pro-fold` | open | 180 | vertical | 425.85, 0, 0, 882.87 | no | — |
| `pixel-9-pro-fold` | open | 270 | horizontal | 0, 425.85, 882.87, 0 | no | — |
| `pixel-9-pro-fold` | half-open | 0 | vertical | 425.85, 0, 0, 882.87 | yes | — |
| `pixel-9-pro-fold` | half-open | 90 | horizontal | 0, 425.85, 882.87, 0 | yes | — |
| `pixel-9-pro-fold` | half-open | 180 | vertical | 425.85, 0, 0, 882.87 | yes | — |
| `pixel-9-pro-fold` | half-open | 270 | horizontal | 0, 425.85, 882.87, 0 | yes | — |
