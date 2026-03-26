# Slate Command Design System — Sandkasten Handoff

Applied to Auftragstaktik on 2026-03-25. Apply the same system to Sandkasten for visual unity between the two projects.

## What Changed

### Fonts
**Old:** Share Tech Mono + Rajdhani
**New:** IBM Plex Mono + IBM Plex Sans

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap
```

CSS variables:
```css
--font-mono: "IBM Plex Mono", "Courier New", monospace;
--font-heading: "IBM Plex Sans", "Arial", sans-serif;
```

### Color Palette (Dark Theme)

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `--color-terminal-green` | `#00ff41` | `#3B82F6` |
| `--color-terminal-green-dim` | `#00cc33` | `#2563EB` |
| `--color-terminal-amber` | `#ffbf00` | `#F59E0B` |
| `--color-terminal-red` | `#ff3333` | `#EF4444` |
| `--color-terminal-blue` | `#00aaff` | `#06B6D4` |
| `--color-tactical-dark` | `#0a0a0f` | `#0B1120` |
| `--color-tactical-panel` | `#12121a` | `#111827` |
| `--color-tactical-border` | `#1e1e2e` | `#334155` |
| `--color-tactical-surface` | `#181824` | `#1F2937` |
| `--color-tactical-text` | `#c8c8d4` | `#E2E8F0` |
| `--color-tactical-text-dim` | `#6b6b80` | `#94A3B8` |

**New variable (add this):**
| `--color-status-green` | (n/a) | `#22C55E` |

Use `status-green` for connected/active/confirmed status indicators. The old `terminal-green` is now the primary UI accent (blue).

### Color Palette (Light Theme)

| Variable | New Value |
|----------|-----------|
| `--color-terminal-green` | `#1D4ED8` |
| `--color-terminal-green-dim` | `#1E40AF` |
| `--color-terminal-amber` | `#B45309` |
| `--color-terminal-red` | `#DC2626` |
| `--color-terminal-blue` | `#0E7490` |
| `--color-status-green` | `#15803D` |
| `--color-tactical-dark` | `#F1F5F9` |
| `--color-tactical-panel` | `#FFFFFF` |
| `--color-tactical-border` | `#CBD5E1` |
| `--color-tactical-surface` | `#E2E8F0` |
| `--color-tactical-text` | `#0F172A` |
| `--color-tactical-text-dim` | `#475569` |

### What Was Removed
1. **Scanline CRT overlay** — delete the CSS and component, remove from shell
2. **Green glow borders** (`.glow-border` class) — remove CSS rule and class usage
3. **Green rotated diamond** in panel headers — replace with a subtle vertical accent bar (`w-1 h-4 bg-terminal-green/60 rounded-sm`)
4. **Wide letter-spacing** on titles (`tracking-[0.3em]`) — reduce to `tracking-wider`

### What to Change in Sandkasten

1. **`src/app/globals.css`** — Update all CSS variable values to match the table above. Add `--color-status-green`. Remove scanline/glow CSS if present. Update font-family declarations.
2. **`src/app/layout.tsx`** — Replace Google Fonts `<link>` URL with IBM Plex import above.
3. **Any component using `bg-terminal-green` for status indicators** — change to `bg-status-green`
4. **MapLibre control overrides** — update background rgba to `rgba(11, 17, 32, 0.9)` from the old purple-black value. Also move `.maplibregl-ctrl-top-right` to bottom-right (`top: auto !important; bottom: 80px !important; right: 10px !important;`) to avoid overlapping any layer control panels.
5. **Any scanline overlay components** — remove
6. **Any glow-border usage** — remove the class

### Design Rationale
- IBM Plex: designed for data-dense enterprise UIs, mono and sans share design DNA
- Blue accent instead of neon green: professional intelligence dashboard feel (Bloomberg/Palantir direction)
- Navy-slate backgrounds instead of purple-black: more depth and warmth
- Green reserved for status indicators only (connected, active, confirmed)
- Amber stays for warnings, timestamps, historical labels
- Severity colors standardized to Tailwind palette for consistency
