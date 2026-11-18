---
description: Renaming a Kotlin function has nothing to do with screens, and does not invoke the skill.
tags: [trigger, negative]
allowed_tools: [Read, Glob, Grep, Skill]
max_turns: 4
expected_outcome: The function and its call site are renamed to fetchUser, and the skill does not fire.
---

Rename `loadUser` to `fetchUser` here, call site included, and show me the result:

```kotlin
class UserRepository(private val api: Api) {
  suspend fun loadUser(id: String): User = api.user(id)
}

suspend fun show(repository: UserRepository) {
  val user = repository.loadUser("42")
  println(user.name)
}
```
