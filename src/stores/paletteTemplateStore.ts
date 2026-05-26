import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Color, Palette, PaletteTemplate, Project } from '../domain/model'
import { uid, makeTransparentColor } from '../domain/color'
import { clonePalette } from '../domain/paletteOps'

const STORAGE_KEY = 'redit.palette-templates'

function c(name: string, r: number, g: number, b: number): Color {
  return { id: uid(), name, r, g, b, a: 255 }
}

function makeBuiltIn(id: string, name: string, description: string, colors: Color[]): PaletteTemplate {
  return { id, name, description, colors: [makeTransparentColor(), ...colors], isBuiltIn: true }
}

function buildEGAColors(): Color[] {
  const colors: Color[] = []
  for (let v = 0; v < 64; v++) {
    const rH = (v >> 5) & 1
    const gH = (v >> 4) & 1
    const bH = (v >> 3) & 1
    const rL = (v >> 2) & 1
    const gL = (v >> 1) & 1
    const bL = v & 1
    colors.push(c(`EGA ${v}`, rH * 170 + rL * 85, gH * 170 + gL * 85, bH * 170 + bL * 85))
  }
  return colors
}

const BUILT_IN: PaletteTemplate[] = [
  makeBuiltIn('builtin-cga', 'CGA', 'IBM CGA 16-color palette', [
    c('Black',         0,   0,   0),
    c('Blue',          0,   0, 170),
    c('Green',         0, 170,   0),
    c('Cyan',          0, 170, 170),
    c('Red',         170,   0,   0),
    c('Magenta',     170,   0, 170),
    c('Brown',       170,  85,   0),
    c('Light Gray',  170, 170, 170),
    c('Dark Gray',    85,  85,  85),
    c('Light Blue',   85,  85, 255),
    c('Light Green',  85, 255,  85),
    c('Light Cyan',   85, 255, 255),
    c('Light Red',   255,  85,  85),
    c('Light Magenta', 255, 85, 255),
    c('Yellow',      255, 255,  85),
    c('White',       255, 255, 255),
  ]),
  makeBuiltIn('builtin-ega', 'EGA', 'IBM EGA 64-color palette', buildEGAColors()),
  makeBuiltIn('builtin-pico8', 'PICO-8', 'PICO-8 16-color palette', [
    c('Black',       0,   0,   0),
    c('Dark Blue',  29,  43,  83),
    c('Dark Purple', 126, 37,  83),
    c('Dark Green',  0, 135,  81),
    c('Brown',      171,  82,  54),
    c('Dark Gray',   95,  87,  79),
    c('Light Gray', 194, 195, 199),
    c('White',      255, 241, 232),
    c('Red',        255,   0,  77),
    c('Orange',     255, 163,   0),
    c('Yellow',     255, 236,  39),
    c('Green',        0, 228,  54),
    c('Blue',        41, 173, 255),
    c('Indigo',     131, 118, 156),
    c('Pink',       255, 119, 168),
    c('Peach',      255, 204, 170),
  ]),
  makeBuiltIn('builtin-db16', 'DB16 Dawnbringer', 'Dawnbringer 16-color palette', [
    c('#140c1c',  20,  12,  28),
    c('#442434',  68,  36,  52),
    c('#30346d',  48,  52, 109),
    c('#4e4a4e',  78,  74,  78),
    c('#854c30', 133,  76,  48),
    c('#346524',  52, 101,  36),
    c('#d04648', 208,  70,  72),
    c('#757161', 117, 113,  97),
    c('#597dce',  89, 125, 206),
    c('#d27d2c', 210, 125,  44),
    c('#8595a1', 133, 149, 161),
    c('#6daa2c', 109, 170,  44),
    c('#d2aa99', 210, 170, 153),
    c('#6dc2ca', 109, 194, 202),
    c('#dad45e', 218, 212,  94),
    c('#deeed6', 222, 238, 214),
  ]),
  makeBuiltIn('builtin-db32', 'DB32 Dawnbringer', 'Dawnbringer 32-color palette', [
    c('#000000',   0,   0,   0),
    c('#222034',  34,  32,  52),
    c('#45283c',  69,  40,  60),
    c('#663931', 102,  57,  49),
    c('#8f563b', 143,  86,  59),
    c('#df7126', 223, 113,  38),
    c('#d9a066', 217, 160, 102),
    c('#eec39a', 238, 195, 154),
    c('#fbf236', 251, 242,  54),
    c('#99e550', 153, 229,  80),
    c('#6abe30', 106, 190,  48),
    c('#37946e',  55, 148, 110),
    c('#4b692f',  75, 105,  47),
    c('#524b24',  82,  75,  36),
    c('#323c39',  50,  60,  57),
    c('#3f3f74',  63,  63, 116),
    c('#306082',  48,  96, 130),
    c('#5b6ee1',  91, 110, 225),
    c('#639bff',  99, 155, 255),
    c('#5fcde4',  95, 205, 228),
    c('#cbdbfc', 203, 219, 252),
    c('#ffffff', 255, 255, 255),
    c('#9badb7', 155, 173, 183),
    c('#847e87', 132, 126, 135),
    c('#696a6a', 105, 106, 106),
    c('#595652',  89,  86,  82),
    c('#76428a', 118,  66, 138),
    c('#ac3232', 172,  50,  50),
    c('#d95763', 217,  87,  99),
    c('#d77bba', 215, 123, 186),
    c('#8f974a', 143, 151,  74),
    c('#8a6f30', 138, 111,  48),
  ]),
  // Pepto's calibrated PAL measurement — the reference used by VICE and most accurate emulators.
  // Values derived from oscilloscope measurements of actual C64 hardware output.
  makeBuiltIn('builtin-vic2', 'VIC-II', 'Commodore 64/128 VIC-II 16-color palette (Pepto calibration)', [
    c('Black',        0,   0,   0),
    c('White',      255, 255, 255),
    c('Red',        104,  55,  43),
    c('Cyan',       112, 164, 178),
    c('Purple',     111,  61, 134),
    c('Green',       88, 141,  67),
    c('Blue',        53,  40, 121),
    c('Yellow',     184, 199, 111),
    c('Orange',     111,  79,  37),
    c('Brown',       67,  57,   0),
    c('Light Red',  154, 103,  89),
    c('Dark Grey',   68,  68,  68),
    c('Grey',       108, 108, 108),
    c('Light Green',154, 210, 132),
    c('Light Blue', 108,  94, 181),
    c('Light Grey', 149, 149, 149),
  ]),
  makeBuiltIn('builtin-zxspectrum', 'ZX Spectrum', 'Sinclair ZX Spectrum 16-color palette', [
    c('Black',         0,   0,   0),
    c('Blue',          0,   0, 215),
    c('Red',         215,   0,   0),
    c('Magenta',     215,   0, 215),
    c('Green',         0, 215,   0),
    c('Cyan',          0, 215, 215),
    c('Yellow',      215, 215,   0),
    c('White',       215, 215, 215),
    c('Bright Black',  0,   0,   0),
    c('Bright Blue',   0,   0, 255),
    c('Bright Red',  255,   0,   0),
    c('Bright Magenta', 255, 0, 255),
    c('Bright Green',  0, 255,   0),
    c('Bright Cyan',   0, 255, 255),
    c('Bright Yellow', 255, 255,  0),
    c('Bright White', 255, 255, 255),
  ]),
]

function loadUserTemplates(): PaletteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PaletteTemplate[]
  } catch {
    return []
  }
}

export const usePaletteTemplateStore = defineStore('paletteTemplates', () => {
  const builtIn = BUILT_IN
  const userTemplates = ref<PaletteTemplate[]>(loadUserTemplates())

  watch(userTemplates, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates.value))
  }, { deep: true })

  function promoteToTemplate(palette: Palette): void {
    if (builtIn.some(t => t.name === palette.name)) {
      throw new Error(`Cannot overwrite built-in template name "${palette.name}"`)
    }
    const cloned = clonePalette(palette)
    const template: PaletteTemplate = { ...cloned, isBuiltIn: false }
    const existing = userTemplates.value.findIndex(t => t.name === palette.name)
    if (existing >= 0) {
      userTemplates.value.splice(existing, 1, template)
    } else {
      userTemplates.value.push(template)
    }
  }

  function importIntoProject(templateId: string, project: Project): void {
    const template = [...builtIn, ...userTemplates.value].find(t => t.id === templateId)
    if (!template) return
    project.palettes.push(clonePalette(template))
  }

  function deleteUserTemplate(name: string): void {
    const idx = userTemplates.value.findIndex(t => t.name === name)
    if (idx >= 0) {
      userTemplates.value.splice(idx, 1)
    }
  }

  return { builtIn, userTemplates, promoteToTemplate, importIntoProject, deleteUserTemplate }
})
