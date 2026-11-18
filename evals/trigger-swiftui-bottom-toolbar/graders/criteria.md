---
type: llm
---
1. The buttons stay above the bottom safe-area inset, and the answer gives that inset as 34 pt for
   the iPhone 17 (in portrait).
2. The view keeps the toolbar's background running to the screen's bottom edge, for example with
   `safeAreaInset(edge: .bottom)` or `.ignoresSafeArea(edges: .bottom)` on the background only.
3. No number in the answer contradicts these: window 402 × 874 pt, insets 62 / 34 / 0 / 0 in
   portrait.
