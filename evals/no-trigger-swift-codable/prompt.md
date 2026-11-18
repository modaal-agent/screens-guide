---
description: Decoding JSON in Swift has nothing to do with screens, and does not invoke the skill.
tags: [trigger, negative]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 4
expected_outcome: A Codable struct with a CodingKeys entry for created_at, and the skill does not fire.
---

Write a Swift `Codable` struct for this JSON, with `createdAt` as a `Date`:

```json
{ "id": 7, "title": "Groceries", "created_at": "2026-11-17T09:30:00Z" }
```
