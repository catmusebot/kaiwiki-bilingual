import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { classNames } from "../util/lang"
import type { BilingualMode, BilingualOptions } from "../types"
import style from "./styles/bilingual.scss"
// @ts-expect-error - inline script import handled by Quartz bundler
import script from "./scripts/bilingual.inline.ts"

const labels: Record<BilingualMode, string> = {
  zh: "中文",
  en: "英文",
  both: "双语",
}

const modes: BilingualMode[] = ["en", "zh", "both"]

function normalizeMode(value: unknown): BilingualMode {
  return value === "en" || value === "zh" || value === "both" ? value : "en"
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  return false
}

const BilingualToggle = (opts?: Partial<BilingualOptions>): QuartzComponent => {
  const defaultMode = normalizeMode(opts?.defaultMode)
  const storageKey = opts?.storageKey ?? "kaiwiki-bilingual-mode"

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const frontmatter = fileData.frontmatter as Record<string, unknown> | undefined
    if (!fileData.bilingual && !coerceBoolean(frontmatter?.bilingual)) return null

    const pageDefaultMode = normalizeMode(fileData.bilingualDefault ?? frontmatter?.bilingualDefault)

    return (
      <div
        class={classNames(displayClass, "bilingual-toggle")}
        data-default-mode={pageDefaultMode || defaultMode}
        data-storage-key={String(fileData.bilingualStorageKey ?? storageKey)}
      >
        {modes.map((mode) => (
          <button
            type="button"
            class="bilingual-toggle-button"
            data-bilingual-mode={mode}
            aria-pressed={mode === pageDefaultMode ? "true" : "false"}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
    )
  }

  Component.css = style
  Component.afterDOMLoaded = script
  return Component
}

export default BilingualToggle satisfies QuartzComponentConstructor<Partial<BilingualOptions>>
