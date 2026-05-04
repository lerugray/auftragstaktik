# Keyboard reference

Shortcuts are scoped so digit keys, arrows, and `?` do not run while focus is in a text field, `select`, or `contenteditable`, or inside an open `aria-modal` dialog (help). Map pan/zoom uses the same rules as MapLibre’s built-in keyboard handler, but runs at the window level so arrows never move the map when you are typing in the briefing panel or feed filters.

| Shortcut | Action | Context |
|----------|--------|---------|
| `1`–`9` | Toggle map layer 1–9 (frontlines, aircraft, AD, …) | Global, not when typing / not in modal |
| `+` / `=` | Zoom in (Shift doubles step) | Global, not when typing / not in modal |
| `-` / `_` | Zoom out (Shift doubles step) | Global, not when typing / not in modal |
| Arrow keys | Pan map | Global when allowed; blocked while typing or in help |
| `Esc` | Close map detail panel; closes help and stops propagation so other handlers do not run | Global / modal |
| `?` | Open help (Shift+/ on US QWERTY) | Global, not when typing |
| `Tab` | Next focusable | Help modal traps focus while open |
| `Shift`+`Tab` | Previous focusable | Help modal traps focus while open |

The help scrim uses `tabIndex={-1}` so Tab cycles only through controls inside the dialog. After help closes, focus returns to the control that opened it.
