// @ts-nocheck

const validModes = new Set(["en", "zh", "both"])

function normalizeMode(mode, fallback = "both") {
  return typeof mode === "string" && validModes.has(mode) ? mode : fallback
}

function updateToggleState(toggle, mode) {
  toggle.querySelectorAll("[data-bilingual-mode]").forEach((button) => {
    const buttonMode = normalizeMode(button.dataset.bilingualMode)
    const selected = buttonMode === mode
    button.classList.toggle("is-active", selected)
    button.setAttribute("aria-pressed", selected ? "true" : "false")
  })
}

function setBilingualMode(toggle, storageKey, mode, persist = true) {
  if (persist) localStorage.setItem(storageKey, mode)
  document.documentElement.dataset.bilingualMode = mode
  updateToggleState(toggle, mode)
}

function transitionBilingualMode(toggle, storageKey, mode) {
  if (document.documentElement.dataset.bilingualMode === mode) return

  const run = () => setBilingualMode(toggle, storageKey, mode)
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof document.startViewTransition !== "function"
  ) {
    run()
    return
  }

  document.startViewTransition(run)
}

function applyBilingualMode(root = document) {
  const toggle = root.querySelector(".bilingual-toggle")
  if (!toggle) return

  const storageKey = toggle.dataset.storageKey || "kaiwiki-bilingual-mode"
  const defaultMode = normalizeMode(toggle.dataset.defaultMode)
  const storedValue = localStorage.getItem(storageKey)
  const storedMode = storedValue ? normalizeMode(storedValue, defaultMode) : defaultMode
  const mode = storedMode || defaultMode

  setBilingualMode(toggle, storageKey, mode, false)

  toggle.querySelectorAll("[data-bilingual-mode]").forEach((button) => {
    const buttonMode = normalizeMode(button.dataset.bilingualMode)
    button.onclick = () => {
      transitionBilingualMode(toggle, storageKey, buttonMode)
    }
  })
}

document.addEventListener("nav", () => applyBilingualMode())
document.addEventListener("render", () => applyBilingualMode())
applyBilingualMode()
