<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Component } from 'vue'
import GeneralSettings from './settings/GeneralSettings.vue'
import EditorSettings from './settings/EditorSettings.vue'
import ProjectSettings from './settings/ProjectSettings.vue'

const router = useRouter()

const categories: { id: string; label: string; component: Component }[] = [
  { id: 'general', label: 'General', component: GeneralSettings },
  { id: 'editor',  label: 'Editor',  component: EditorSettings  },
  { id: 'project', label: 'Project', component: ProjectSettings },
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
  width: var(--rd-sidebar-w-narrow);
  background: var(--rd-color-surface-1);
  border-right: var(--rd-border-w) solid var(--rd-color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: var(--rd-space-4) 0;
}

.back-btn {
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
  text-align: left;
  padding: var(--rd-space-2) var(--rd-space-6) var(--rd-space-5);
  cursor: pointer;
}
.back-btn:hover { color: var(--rd-color-text); }

.category-list { display: flex; flex-direction: column; }

.category-btn {
  background: none;
  border: none;
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-12);
  text-align: left;
  padding: var(--rd-space-3) var(--rd-space-6);
  cursor: pointer;
  border-radius: 0;
  border-left: var(--rd-border-w-active) solid transparent;
}
.category-btn:hover { color: var(--rd-color-text); background: var(--rd-color-surface-2); }
.category-btn.active {
  color: var(--rd-color-accent);
  background: var(--rd-color-surface-2);
  border-left-color: var(--rd-color-accent);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--rd-space-9) var(--rd-space-10);
}
</style>
