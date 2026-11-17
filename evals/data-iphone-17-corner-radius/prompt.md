---
description: The iPhone 17's corner radius and the concentric radius for a 16 pt margin.
tags: [data, ios]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 8
expected_outcome: |
  The display corner radius is 62 pt (iOS 27.0). A card 16 pt from the side and bottom edges takes
  62 − 16 = 46 pt to stay concentric.
---

On the iPhone 17, what is the display's corner radius in points? I have a card 16 pt from the
screen's left, right and bottom edges, and I want its bottom corners to follow the display's curve
at an even distance. What corner radius should the card have?
