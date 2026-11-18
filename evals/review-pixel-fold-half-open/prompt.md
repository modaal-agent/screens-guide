---
description: A list and a button across the Pixel Fold's fold when half open.
tags: [review, android, foldable]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 10
expected_outcome: |
  Half open in landscape, the inner screen is 841.14 × 700.95 dp with a vertical fold at x 420.57
  dp that separates the halves. The list and the button both cross it. Fix: split into two panes at
  420.57 dp and keep the button inside one half.
---

Review this Compose screen for the Pixel Fold, half open like a book: the hinge is vertical and the
inner screen is in landscape. Frames are in dp, in window coordinates from the top left:

| element | x | y | width | height |
| --- | --- | --- | --- | --- |
| top app bar | 0 | 28.19 | 841.14 | 64 |
| message list | 0 | 92.19 | 841.14 | 540 |
| send button | 390 | 590 | 80 | 40 |

What breaks on this device in this posture?
