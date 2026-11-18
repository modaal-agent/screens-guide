---
description: A Compose bottom bar overlapping the gesture area invokes the skill.
tags: [trigger, android]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 8
expected_outcome: |
  The skill fires. Material 3's NavigationBar with its default window insets keeps its items above
  the gesture inset: 80 dp of bar above the 24 dp inset on the Pixel 8, 104 dp in all.
---

My Jetpack Compose app went edge to edge, and now on a Pixel 8 the icons of my bottom navigation
bar sit on top of the gesture handle. The bar is a `Row` with a fixed height of 56.dp inside a
`Scaffold(bottomBar = …)`. How do I fix it, and how tall will the bar be on that phone?
