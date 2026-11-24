---
description: The iPhone 16's tab bar frame on iOS 18.6 and iOS 27.2; the skill's device table holds the current build only, so 18.6 needs the MCP server.
tags: [data, ios, mcp, web]
allowed_tools: [Read, Glob, Grep, Skill, WebSearch, WebFetch, mcp__plugin_screens-guide_screens-guide__list_devices, mcp__plugin_screens-guide_screens-guide__get_device, mcp__plugin_screens-guide_screens-guide__compare_devices, mcp__plugin_screens-guide_screens-guide__check_layout, mcp__plugin_screens-guide_screens-guide__convert_units]
max_turns: 12
expected_outcome: |
  iOS 18.6: a full-width bar at x 0, y 769, 393 × 83 pt, running to the bottom edge. iOS 27.2: a
  capsule at x 59.67, y 769, 274 × 62 pt, 21 pt above the bottom edge. The card's bottom edge is at
  y 761 on both.
---

My SwiftUI app runs on the iPhone 16 under iOS 18.6 and under iOS 27.2. In portrait, with the
system tab bar showing, what is the tab bar's frame (x, y, width and height, in points) on each
version? A card sits with its bottom edge 8 pt above the tab bar: what is the card's bottom y on
each version?
