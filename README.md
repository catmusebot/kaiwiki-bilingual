# kaiwiki-bilingual

Quartz v5 plugin — **automatic paragraph-level bilingual reading mode** for KaiWiki.

The plugin scans adjacent Markdown blocks (paragraphs, headings, lists) and pairs English ↔ Chinese siblings into a side-by-side bilingual layout. Readers toggle between three modes via a toolbar control:

- **中文** — show only the Chinese block
- **英文** — show only the English block
- **双语** — show both, side by side (default)

The selected mode persists in `localStorage` and applies across SPA navigation.

## Installation

This plugin is not published to npm. Reference it directly from GitHub in your Quartz config:

```yaml
# quartz.config.yaml
plugins:
  - source: github:CatMuse/kaiwiki-bilingual
    enabled: true
    options:
      defaultMode: both        # en | zh | both
      storageKey: kaiwiki-bilingual-mode
    order: 55
    layout:
      position: left
      priority: 20
      display: all
      group: toolbar
```

Then run `npx quartz plugin install` (or `npx quartz plugin update`).

## Authoring

Add `bilingual: true` to a page's frontmatter:

```markdown
---
title: My Article
bilingual: true
bilingualDefault: both
---

This is an English paragraph about digital gardens.

这是一段关于数字花园的中文段落。

The next English paragraph will pair with the Chinese one below.

下一个英文段落会和下面的中文段落配对。

这是一段关于第二大脑的中文。
```

The transformer detects adjacent EN/ZH blocks (CJK ≥ 4 chars & ratio ≥ 0.28 ⇒ ZH, Latin ≥ 8 chars & CJK ratio ≤ 0.08 ⇒ EN) and wraps them as:

```html
<div class="bilingual-pair" data-bilingual-pair="N">
  <p class="bilingual-block bilingual-en">…</p>
  <p class="bilingual-block bilingual-zh">…</p>
</div>
```

No manual `<span>` markers are needed.

For lists, items are paired **as a whole** (the list block must contain an even number of items, alternating EN/ZH).

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultMode` | `"en" \| "zh" \| "both"` | `"both"` | Mode used when no per-page override |
| `storageKey` | `string` | `"kaiwiki-bilingual-mode"` | `localStorage` key for the chosen mode |

Frontmatter overrides:

| Frontmatter | Effect |
|---|---|
| `bilingual: true` | Enables pairing on this page (required) |
| `bilingualDefault: en\|zh\|both` | Overrides `defaultMode` per page |
| `bilingualStorageKey: string` | Overrides `storageKey` per page |

## How it works

1. **Build time** — `BilingualTransformer` walks the HAST tree, scans sibling elements, and groups EN/ZH pairs into `bilingual-pair` divs.
2. **Render time** — `BilingualToggle` emits three buttons with `data-bilingual-mode` attributes into the page layout.
3. **Runtime** — `bilingual.inline.ts` reads the saved mode from `localStorage` and toggles `display` on `.bilingual-en` / `.bilingual-zh` blocks.

## Compatibility

- Quartz ≥ 5.0.0
- Node ≥ 22

## License

MIT
