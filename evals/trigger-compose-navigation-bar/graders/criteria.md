---
type: llm
---
1. The fix keeps the bar's background running to the bottom edge and pads its items above the
   navigation-bar or gesture inset, for example Material 3's `NavigationBar` with its default
   `windowInsets`, or `Modifier.windowInsetsPadding(WindowInsets.navigationBars)` on the `Row`.
2. The answer gives the bar's height on the Pixel 8 as 80 dp above a 24 dp inset, 104 dp from the
   bottom edge, or says the inset is 24 dp there.
