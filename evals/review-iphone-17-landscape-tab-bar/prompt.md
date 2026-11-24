---
description: Three frames on the iPhone 17 in landscape, under the floating tab bar; the bar's x and width come from the MCP server's readings.
tags: [review, ios, mcp, web]
allowed_tools: [Read, Glob, Grep, Skill, WebSearch, WebFetch, mcp__plugin_screens-guide_screens-guide__list_devices, mcp__plugin_screens-guide_screens-guide__get_device, mcp__plugin_screens-guide_screens-guide__compare_devices, mcp__plugin_screens-guide_screens-guide__check_layout, mcp__plugin_screens-guide_screens-guide__convert_units]
max_turns: 12
expected_outcome: |
  At rotation 90 the window is 874 × 402 pt with insets 0 / 20 / 62 / 62, and the tab bar is a
  capsule at x 307.33, y 338, 259.33 × 44 pt. The now playing bar runs under it (204.66 × 44 pt)
  and 8 pt into the bottom inset; the list's bottom right sits under it too (54.67 × 44 pt). The
  detail reaches 62 pt into the right inset, and its square bottom-right corner is cut by 12.89 pt
  (concentric radius 42 pt).
---

Review this screen for the iPhone 17 in landscape at rotation 90 (the top of the phone on the
left). It sits in a SwiftUI `TabView` with the system tab bar, under an inline navigation bar.
Frames are in points, in window coordinates from the top left:

| element | x | y | width | height | corner radius |
| --- | --- | --- | --- | --- | --- |
| list | 62 | 78 | 300 | 304 | 0 |
| now playing bar | 362 | 330 | 300 | 60 | 12 |
| detail | 662 | 78 | 212 | 304 | 0 |

Does anything collide with the hardware or the system UI? Give numbers, and a fix for each
collision.
