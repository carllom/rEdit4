<script setup lang="ts">
import type { Component } from 'vue'
import { usePaintStore, type Tool } from '../../stores/paintStore'
import { Dot, PenLine, PencilRuler, Spline, Square, Circle, PaintBucket, ReplaceAll, Eraser, BrushCleaning } from '@lucide/vue'

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
  {
    id: 'ellipse', label: 'Ellipse', shortcut: 'C',
    variants: [
      { id: 'outline', label: 'Outline', icon: Circle },
      { id: 'filled',  label: 'Filled',  icon: Circle, filled: true },
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
  padding: var(--rd-space-3) 0;
}

.section-label {
  font-size: var(--rd-text-10);
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
  color: var(--rd-color-text-muted);
  padding: var(--rd-space-2) var(--rd-space-5) var(--rd-space-1);
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
  padding: 5px var(--rd-space-5);
  background: none;
  border: none;
  color: var(--rd-color-text);
  cursor: pointer;
  text-align: left;
  font-size: var(--rd-text-12);
  border-left: var(--rd-border-w-active) solid transparent;
}

.tool-btn:hover {
  background: var(--rd-color-surface-2);
}

.tool-btn.active {
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
  color: var(--rd-color-accent);
}

.tool-key {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  background: var(--rd-color-surface-3);
  border-radius: var(--rd-radius-1);
  padding: 1px 4px;
  font-family: var(--rd-font-mono);
}

.variant-row {
  display: flex;
  flex-direction: row;
  gap: 3px;
  padding: 3px var(--rd-space-4) 5px var(--rd-space-6);
  background: var(--rd-color-surface-2);
  border-left: var(--rd-border-w-active) solid var(--rd-color-accent);
}

.variant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--rd-hit-lg);
  height: var(--rd-hit-lg);
  padding: 0;
  background: none;
  border: var(--rd-border-w) solid transparent;
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.variant-btn:hover {
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text);
}

.variant-btn.active {
  color: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  background: var(--rd-color-surface-3);
}

.variant-btn--filled :deep(path),
.variant-btn--filled :deep(rect),
.variant-btn--filled :deep(circle) {
  fill: currentColor;
  stroke: none;
}
</style>
