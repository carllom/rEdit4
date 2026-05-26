<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="palettes-view">
    <div class="palettes-header">
      <button class="back-btn" @click="router.back()">← Back</button>
      <span class="view-title">Palette Manager</span>
    </div>
    <div class="palettes-body">
      <p class="placeholder-text">Palette Manager — coming soon.</p>
    </div>
  </div>
</template>

<style scoped>
.palettes-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: var(--color-bg);
}

.palettes-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.back-btn {
  padding: 3px 10px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 11px;
}
.back-btn:hover { color: var(--color-text); background: var(--color-surface-3); }

.view-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.palettes-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
