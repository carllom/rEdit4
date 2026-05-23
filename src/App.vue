<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './components/ui/AppSidebar.vue'
import { useProjectStore } from './stores/projectStore'

const projectStore = useProjectStore()
</script>

<template>
  <div class="app">
    <header class="app-header">
      <span class="app-title">rEdit</span>
      <span v-if="projectStore.project" class="project-name">
        {{ projectStore.project.name }}<span v-if="projectStore.isDirty" class="dirty-marker">*</span>
      </span>
    </header>
    <div class="app-body">
      <AppSidebar />
      <main class="app-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-bg:           #1e1e1e;
  --color-surface:      #252526;
  --color-surface-2:    #2d2d2d;
  --color-surface-3:    #3a3a3a;
  --color-border:       #3c3c3c;
  --color-text:         #cccccc;
  --color-text-muted:   #888888;
  --color-accent:       #4fc3f7;
  --color-accent-hover: #81d4fa;
  --color-danger:       #f44747;
  --sidebar-width:      200px;
  --header-height:      34px;
}

html, body, #app {
  height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  overflow: hidden;
  user-select: none;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  flex-shrink: 0;
}

.app-title {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-accent);
  font-size: 13px;
}

.project-name {
  color: var(--color-text-muted);
  font-size: 11px;
}

.dirty-marker { color: var(--color-accent); }

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
