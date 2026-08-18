import type { ReactNode } from 'react'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgModule from '@resvg/resvg-wasm/index_bg.wasm'
import satori, { init as initYoga } from 'satori/standalone'
import yogaModule from 'satori/yoga.wasm'
import plexRegularUri from './fonts/IBMPlexSans-Regular.ttf?inline'
import plexSemiBoldUri from './fonts/IBMPlexSans-SemiBold.ttf?inline'
import whaleIconUri from './whale-brand.png?inline'

/**
 * Server-side PNG rendering for social cards.
 *
 * The pipeline is satori (JSX → SVG) into resvg (SVG → PNG), both compiled to
 * run inside workerd. workerd refuses `WebAssembly.instantiate(bytes)`, which
 * is what satori's default bundle does to its inlined yoga Wasm — so this uses
 * the standalone build and hands it the yoga binary as an already-compiled
 * module, same as resvg arrives: one `WebAssembly.Module` each, instantiated
 * the only way a Worker allows. No canvas, no native code.
 *
 * Fonts have to be bytes in memory at both stages: satori measures text with
 * them and resvg shapes text with them. IBM Plex Sans is the site's face
 * (`app.css`), so the two weights the card uses are inlined into the Worker
 * bundle as data URIs — a Worker has no filesystem to read them from at
 * request time. They are the static TTFs from the IBM Plex release, OFL
 * licensed (see `fonts/OFL.txt`); the variable builds google/fonts ships are
 * not shaped correctly by resvg.
 *
 * The whale mark is a copy of `public/icons/whale-brand.png`; that one is
 * served to browsers, this one is bundled for the renderer. Same bytes, same
 * mark — if the brand changes, both change.
 *
 * Colours are hex, not the `oklch()` tokens of `app.css`: resvg rasterises
 * SVG, and SVG colour stops at rgb(). The values below are the dark palette
 * resolved to sRGB.
 */
export const OG_THEME = {
  /** The ground of the committed site card — oklch(0.148 0.035 242). */
  background: '#000c18',
  /** --fg — oklch(0.96 0.005 250). */
  foreground: '#eff2f5',
  /** --muted-fg — oklch(0.685 0.02 250). */
  muted: '#919ba6',
  /** The whale's blue at a lightness the dark ground can carry — oklch(0.72 0.145 263). */
  primary: '#74a2ff',
} as const

/** One face, two weights: everything the cards are allowed to set. */
export const OG_FONT_FAMILY = 'IBM Plex Sans'

/** The brand mark, ready for an `<img src>` in a satori tree. */
export const WHALE_ICON = whaleIconUri

let wasmReady: Promise<void> | undefined

/**
 * Both Wasm modules are linked once per isolate rather than once per request —
 * the difference between a warm render of tens of milliseconds and a cold one
 * of hundreds. The `.wasm` imports arrive as compiled modules through the
 * Cloudflare Vite plugin.
 */
function ready(): Promise<void> {
  wasmReady ??= Promise.all([initResvg(), initYoga(yogaModule)]).then(() => undefined)
  return wasmReady
}

async function initResvg(): Promise<void> {
  try {
    await initWasm(resvgModule)
  } catch (error) {
    // Vite dev reloads this module but not the pre-bundled resvg dependency,
    // whose Wasm state survives — a second init in the same dep instance is
    // already done, not an error. Anything else is a real failure.
    if (!(error instanceof Error && error.message.includes('Already initialized'))) {
      throw error
    }
  }
}

/** A base64 data URI to bytes, without Node's `Buffer` — workerd has `atob`. */
function dataUriBytes(dataUri: string): Uint8Array {
  const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

let fonts: { regular: Uint8Array; semiBold: Uint8Array } | undefined

function fontBytes(): { regular: Uint8Array; semiBold: Uint8Array } {
  fonts ??= {
    regular: dataUriBytes(plexRegularUri),
    semiBold: dataUriBytes(plexSemiBoldUri),
  }
  return fonts
}

/**
 * Render a satori tree to PNG bytes.
 *
 * resvg loads no system fonts — a Worker has none — so every face the SVG can
 * name is handed over as a buffer. The same buffers go to satori, or the text
 * would be measured with one font and shaped with another.
 */
export async function renderOgPng(
  element: ReactNode,
  size: { width: number; height: number },
): Promise<Uint8Array> {
  await ready()
  const { regular, semiBold } = fontBytes()

  const svg = await satori(element, {
    ...size,
    fonts: [
      { name: OG_FONT_FAMILY, weight: 400, data: regular.buffer as ArrayBuffer },
      { name: OG_FONT_FAMILY, weight: 600, data: semiBold.buffer as ArrayBuffer },
    ],
  })

  const resvg = new Resvg(svg, {
    font: { fontBuffers: [regular, semiBold], loadSystemFonts: false },
  })
  try {
    return resvg.render().asPng()
  } finally {
    resvg.free()
  }
}
