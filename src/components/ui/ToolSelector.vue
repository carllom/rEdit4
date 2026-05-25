<script setup lang="ts">
import type { Component } from 'vue'
import { usePaintStore, type Tool } from '../../stores/paintStore'
import { Dot, PenLine, PencilRuler, Spline, Square, PaintBucket, ReplaceAll, Eraser, BrushCleaning } from '@lucide/vue'

const paint = usePaintStore()

interface VariantDef {
  id: string
  label: string
  icon: Component
  filled?: boolean
}

interface ToolDef {
  id: Tool
  label: string
  shortcut: string
  variants?: VariantDef[]
}

const tools: ToolDef[] = [
  {
    id: 'draw', label: 'Draw', shortcut: 'D',
    variants: [
      { id: 'dot',          label: 'Dot',           icon: Dot },
      { id: 'connected',    label: 'Connected',      icon: PenLine },
      { id: 'pixel-perfect',label: 'Pixel-perfect',  icon: PencilRuler },
      { id: 'bezier',       label: 'Bezier',         icon: Spline },
    ],
  },
  {
    id: 'erase', label: 'Erase', shortcut: 'E',
    variants: [
      { id: 'normal', label: 'Normal', icon: Eraser },
      { id: 'clear',  label: 'Clear',  icon: BrushCleaning },
    ],
  },
  {
    id: 'fill', label: 'Fill', shortcut: 'F',
    variants: [
      { id: 'flood',   label: 'Flood',   icon: PaintBucket },
      { id: 'replace', label: 'Replace', icon: ReplaceAll },
    ],
  },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I' },
  { id: 'line',       label: 'Line',       shortcut: 'L' },
  {
    id: 'rect', label: 'Rectangle', shortcut: 'R',
    variants: [
      { id: 'outline', label: 'Outline', icon: Square },
      { id: 'filled',  label: 'Filled',  icon: Square, filled: true },
    ],
  },
]

function toolTooltip(tool: ToolDef): string {
  if (tool.variants && tool.variants.length > 1)
    return `${tool.label} (${tool.shortcut} · ${tool.shortcut} to cycle)`
  return `${tool.label} (${tool.shortcut})`
}
</script>

<template>
  <div class="tool-selector">
    <div class="section-label">Tools</div>
    <div v-for="tool in tools" :key="tool.id" class="tool-group">
      <button
        :class="['tool-btn', { active: paint.activeTool === tool.id }]"
        :title="toolTooltip(tool)"
        @click="paint.setTool(tool.id)"
      >
        <span class="tool-label">{{ tool.label }}</span>
        <kbd class="tool-key">{{ tool.shortcut }}</kbd>
      </button>
      <div
        v-if="paint.activeTool === tool.id && tool.variants"
        class="variant-row"
      >
        <button
          v-for="variant in tool.variants"
          :key="variant.id"
          :class="['variant-btn', { active: paint.toolVariants[tool.id] === variant.id }, { 'variant-btn--filled': variant.filled }]"
          :title="variant.label"
          @click="paint.setToolVariant(tool.id, variant.id)"
        >
          <component :is="variant.icon" :size="15" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-selector {
  padding: 6px 0;
}

.section-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  padding: 4px 10px 2px;
}

.tool-group {
  display: flex;
  flex-direction: column;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  font-size: 12px;
  border-left: 2px solid transparent;
}

.tool-btn:hover {
  background: var(--color-surface-2);
}

.tool-btn.active {
  background: var(--color-surface-2);
  border-left-color: var(--color-accent);
  color: var(--color-accent);
}

.tool-key {
  font-size: 10px;
  color: var(--color-text-muted);
  background: var(--color-surface-3);
  border-radius: 2px;
  padding: 1px 4px;
  font-family: monospace;
}

.variant-row {
  display: flex;
  flex-direction: row;
  gap: 3px;
  padding: 3px 8px 5px 12px;
  background: var(--color-surface-2);
  border-left: 2px solid var(--color-accent);
}

.variant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.variant-btn:hover {
  background: var(--color-surface-3);
  color: var(--color-text);
}

.variant-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-surface-3);
}

.variant-btn--filled :deep(path) {
  fill: currentColor;
  stroke: none;
}
</style>
