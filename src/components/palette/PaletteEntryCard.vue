<script setup lang="ts">
import { computed } from 'vue'
import type { Palette, PaletteKind } from '../../domain/model'
import CheckerSwatch from '../ui/CheckerSwatch.vue'

const props = defineProps<{
  palette: Palette
  kind?: PaletteKind
}>()

const colorCount = computed(() => props.palette.colors.length - 1)


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
    <CheckerSwatch
      v-for="(color, i) in palette.colors"
      :key="i"
      class="swatch-cell"
      :color="color"
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

</style>
