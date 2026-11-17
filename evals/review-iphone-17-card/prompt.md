---
description: A card's frame on the iPhone 17, reviewed against the safe area and the corner curve.
tags: [review, ios]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 10
expected_outcome: |
  The card's bottom corners are square and 16 pt from the side and bottom edges, so the display's
  62 pt corner cuts each off by about 3.05 pt; the card also reaches 18 pt into the 34 pt bottom
  inset, over the home indicator. Fix: a 46 pt corner radius, or move the card above the inset.
---

Review this screen for the iPhone 17 in portrait. Frames are in points, in window coordinates from
the top left, as SwiftUI's global frames report them:

| element | x | y | width | height | corner radius |
| --- | --- | --- | --- | --- | --- |
| header | 0 | 62 | 402 | 54 | 0 |
| list | 0 | 116 | 402 | 584 | 0 |
| summary card | 16 | 700 | 370 | 158 | 0 |

Does anything collide with the hardware or the system UI? Give numbers.
