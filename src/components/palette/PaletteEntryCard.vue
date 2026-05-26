<script setup lang="ts">
import { computed } from 'vue'
import type { Color, Palette, PaletteKind } from '../../domain/model'
import { colorToCSSRGBA } from '../../domain/color'

const props = defineProps<{
  palette: Palette
  kind?: PaletteKind
}>()

const colorCount = computed(() => props.palette.colors.length - 1)

function swatchStyle(color: Color) {
  return { background: colorToCSSRGBA(color) }
}

function truncate(s: string, max = 100) {
  return s.length > max ? s.slice(0, max) + '…' : s
}
</script>

<template>
  <div class="entry-row">
    <span class="entry-name">{{ palette.name }}</span>
    <span v-if="kind === 'builtin'" class="entry-badge entry-badge--builtin">built-in</span>
    <span v-else-if="kind === 'user-template'" class="entry-badge entry-badge--user">user</span>
    <span class="entry-count">{{ colorCount }} colors</span>
  </div>
  <div v-if="palette.description" class="entry-desc">{{ truncate(palette.description) }}</div>
  <div class="swatch-grid">
    <div
      v-for="(color, i) in palette.colors"
      :key="i"
      class="swatch-cell"
      :class="{ 'swatch-transparent': i === 0 }"
      :style="i === 0 ? {} : swatchStyle(color)"
    />
  </div>
</template>

<style scoped>
.entry-row {
  display: flex;
  align-items: center;
  gap: var(--rd-space-3);
  margin-bottom: 3px;
}

.entry-name {
  font-size: var(--rd-text-12);
  font-weight: var(--rd-weight-medium);
  color: var(--rd-color-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-count {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  flex-shrink: 0;
}

.entry-badge {
  font-size: var(--rd-text-9);
  padding: 1px 4px;
  border-radius: var(--rd-radius-1);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: var(--rd-tracking-wide);
}
.entry-badge--builtin {
  background: var(--rd-color-surface-3);
  color: var(--rd-color-text-muted);
  border: var(--rd-border-w) solid var(--rd-color-border);
}
.entry-badge--user {
  background: var(--rd-color-accent-soft);
  color: var(--rd-color-accent);
  border: var(--rd-border-w) solid var(--rd-color-accent-soft-border);
}

.entry-desc {
  font-size: var(--rd-text-10);
  color: var(--rd-color-text-muted);
  margin-bottom: 5px;
  line-height: 1.3;
}

.swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}

.swatch-cell {
  width: 9px;
  height: 9px;
}

.swatch-transparent {
  background-image:
    linear-gradient(45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(-45deg, var(--rd-color-checker-light) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--rd-color-checker-light) 75%),
    linear-gradient(-45deg, transparent 75%, var(--rd-color-checker-light) 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0px;
  background-color: var(--rd-color-checker-dark);
}
</style>
