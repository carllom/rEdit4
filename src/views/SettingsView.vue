<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import GeneralSettings from './settings/GeneralSettings.vue'
import EditorSettings from './settings/EditorSettings.vue'

const router = useRouter()

const categories: { id: string; label: string; component: Component }[] = [
  { id: 'general', label: 'General', component: GeneralSettings },
  { id: 'editor',  label: 'Editor',  component: EditorSettings  },
]

const activeCategoryId = ref('general')
const activeComponent = computed(
  () => categories.find(c => c.id === activeCategoryId.value)?.component ?? null
)
</script>

<template>
  <div class="settings-view">
    <nav class="settings-nav">
      <button class="back-btn" @click="router.push('/')">← Back</button>
      <div class="category-list">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :class="['category-btn', { active: activeCategoryId === cat.id }]"
          @click="activeCategoryId = cat.id"
        >{{ cat.label }}</button>
      </div>
    </nav>
    <div class="settings-content">
      <component :is="activeComponent" />
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-nav {
  width: 160px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 8px 0;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: left;
  padding: 4px 12px 10px;
  cursor: pointer;
}
.back-btn:hover { color: var(--color-text); }

.category-list { display: flex; flex-direction: column; }

.category-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: left;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 0;
}
.category-btn:hover { color: var(--color-text); background: var(--color-surface-2); }
.category-btn.active { color: var(--color-text); background: var(--color-surface-2); }

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}
</style>
