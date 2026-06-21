import type { Element, Root, RootContent } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import type { BilingualOptions } from "./types"

const defaultOptions: BilingualOptions = {
  defaultMode: "en",
  storageKey: "kaiwiki-bilingual-mode",
}

type Lang = "en" | "zh" | "mixed" | "unknown"

function isElement(node: RootContent | Element | undefined): node is Element {
  return Boolean(node && node.type === "element")
}

function textOf(node: RootContent | Element): string {
  if (node.type === "text") return node.value
  if (!("children" in node)) return ""
  return node.children.map((child) => textOf(child as RootContent)).join("")
}

function detectLang(text: string): Lang {
  const compact = text.trim()
  if (!compact) return "unknown"

  const cjk = compact.match(/[\u3400-\u9FFF]/g)?.length ?? 0
  const latin = compact.match(/[A-Za-z]/g)?.length ?? 0
  const total = cjk + latin

  if (total === 0) return "unknown"
  if (cjk >= 4 && cjk / total >= 0.28) return "zh"
  if (latin >= 8 && cjk / total <= 0.08) return "en"
  if (cjk > 0 && latin > 0) return "mixed"
  return "unknown"
}

function isBilingualBlock(node: RootContent | undefined): node is Element {
  return isElement(node) && ["p", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName)
}

function isList(node: RootContent | undefined): node is Element {
  return isElement(node) && (node.tagName === "ul" || node.tagName === "ol")
}

function isListItem(node: RootContent | undefined): node is Element {
  return isElement(node) && node.tagName === "li"
}

function isWhitespace(node: RootContent | undefined): boolean {
  return Boolean(node && node.type === "text" && node.value.trim() === "")
}

function clonePairBlock(node: Element, lang: "en" | "zh"): Element {
  const className = lang === "en" ? "bilingual-block bilingual-en" : "bilingual-block bilingual-zh"
  return {
    ...node,
    properties: {
      ...node.properties,
      className,
      dataBilingualLang: lang,
    },
  }
}

function makePair(enNode: Element, zhNode: Element, index: number): Element {
  return {
    type: "element",
    tagName: "div",
    properties: {
      className: "bilingual-pair",
      dataBilingualPair: String(index),
    },
    children: [clonePairBlock(enNode, "en"), clonePairBlock(zhNode, "zh")],
  }
}

function splitMixedList(node: Element): [Element, Element] | null {
  const listItems = (node.children as RootContent[]).filter(isListItem)
  if (listItems.length < 2 || listItems.length % 2 !== 0) return null

  const langs = listItems.map((item) => detectLang(textOf(item)))
  if (!langs.every((lang) => lang === "en" || lang === "zh")) return null

  const enItems: Element[] = []
  const zhItems: Element[] = []
  let expected: "en" | "zh" = "en"

  for (let i = 0; i < listItems.length; ) {
    const groupLang = langs[i]
    if (groupLang !== expected) return null

    const groupItems: Element[] = []
    while (i < listItems.length && langs[i] === groupLang) {
      const item = listItems[i]
      if (!item) return null
      groupItems.push(item)
      i++
    }

    if (groupLang === "en") {
      enItems.push(...groupItems)
      expected = "zh"
    } else {
      zhItems.push(...groupItems)
      expected = "en"
    }
  }

  if (enItems.length === 0 || enItems.length !== zhItems.length) return null

  return [
    {
      ...node,
      children: enItems,
    },
    {
      ...node,
      children: zhItems,
    },
  ]
}

function wrapBilingualPairs(parent: Root | Element): number {
  if (!("children" in parent)) return 0

  let pairIndex = 0
  const nextChildren: RootContent[] = []
  const children = parent.children as RootContent[]

  for (let i = 0; i < children.length; i++) {
    const current = children[i]
    let nextIndex = i + 1
    while (isWhitespace(children[nextIndex])) nextIndex++
    const next = children[nextIndex]

    if (isList(current)) {
      const splitPair = splitMixedList(current)
      if (splitPair) {
        pairIndex++
        nextChildren.push(makePair(splitPair[0], splitPair[1], pairIndex))
        continue
      }
    }

    if (isBilingualBlock(current) && isBilingualBlock(next) && current.tagName === next.tagName) {
      const currentLang = detectLang(textOf(current))
      const nextLang = detectLang(textOf(next))

      if (currentLang === "en" && nextLang === "zh") {
        pairIndex++
        nextChildren.push(makePair(current, next, pairIndex))
        i = nextIndex
        continue
      }
    }

    if (current && isElement(current)) {
      pairIndex += wrapBilingualPairs(current)
    }
    if (current) nextChildren.push(current)
  }

  parent.children = nextChildren
  return pairIndex
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  return false
}

function normalizeMode(value: unknown, fallback: BilingualOptions["defaultMode"]) {
  return value === "en" || value === "zh" || value === "both" ? value : fallback
}

export const BilingualTransformer: QuartzTransformerPlugin<Partial<BilingualOptions>> = (
  userOpts,
) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "BilingualTransformer",
    htmlPlugins() {
      return [
        () => {
          return (tree: Root, file) => {
            const frontmatter = file.data.frontmatter as Record<string, unknown> | undefined
            if (!coerceBoolean(frontmatter?.bilingual)) return

            const pairCount = wrapBilingualPairs(tree)
            if (pairCount === 0) return

            file.data.bilingual = true
            file.data.bilingualPairCount = pairCount
            file.data.bilingualDefault = normalizeMode(frontmatter?.bilingualDefault, opts.defaultMode)
            file.data.bilingualStorageKey = opts.storageKey
          }
        },
      ]
    },
  }
}
