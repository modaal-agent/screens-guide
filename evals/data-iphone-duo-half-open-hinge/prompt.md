---
description: The iPhone Duo's hinge band, its margins and the camera region when half open, from the beta simulator's readings.
tags: [data, ios, foldable, web]
allowed_tools: [Read, Glob, Grep, Skill, WebSearch, WebFetch, mcp__plugin_screens-guide_screens-guide__list_devices, mcp__plugin_screens-guide_screens-guide__get_device, mcp__plugin_screens-guide_screens-guide__compare_devices, mcp__plugin_screens-guide_screens-guide__check_layout, mcp__plugin_screens-guide_screens-guide__convert_units]
max_turns: 12
expected_outcome: |
  Half open at rotation 0 the window is 669 × 951 pt. The hinge is a horizontal band at y 455.5,
  40 pt tall (to y 495.5), across the full width, and it separates the panes; the system keeps a
  20 pt margin either side. The camera's reserved region is x 535, y 0, 134 × 82 pt, and the top
  inset is 82 pt. Panes: y 82 to 435.5 above, y 515.5 to 917 below.
---

I'm building a two-pane reader for the iPhone Duo, half open and held upright (rotation 0), with
one pane above the hinge and one below it. In points: where exactly is the hinge band, what margin
does the system keep on either side of it, and what does the system reserve at the top for the
camera? Give the y range each pane can use.
