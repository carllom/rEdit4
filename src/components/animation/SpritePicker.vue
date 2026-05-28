<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppDialog from '../ui/AppDialog.vue'
import AppButton from '../ui/AppButton.vue'
import { groupSprites } from '../../domain/spritePickerUtils'
import { renderSpriteThumbnail, SPRITE_THUMB_PX } from '../../renderer/spriteThumbnail'
import { useProjectStore } from '../../stores/projectStore'
import type { Sprite } from '../../domain/model'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  confirm: [spriteId: string]
  cancel: []
}>()

const projectStore = useProjectStore()

const search = ref('')
const collapsed = ref<Set<string>>(new Set())
const collapsedKey = (prefix: string | null) => prefix ?? ''

watch(() => props.open, (open) => {
  if (open) {
    search.value = ''
    collapsed.value = new Set()
  }
})

const sprites = computed<Sprite[]>(() => projectStore.project?.sprites ?? [])
const groups = computed(() => groupSprites(sprites.value, search.value))

function toggleCollapse(prefix: string | null) {
  const k = collapsedKey(prefix)
  if (collapsed.value.has(k)) collapsed.value.delete(k)
  else collapsed.value.add(k)
}

function isCollapsed(prefix: string | null) {
  return collapsed.value.has(collapsedKey(prefix))
}

function select(id: string) {
  emit('confirm', id)
}

function cancel() {
  emit('cancel')
}

function mountCanvas(el: HTMLCanvasElement | null, sprite: Sprite) {
  if (!el) return
  const project = projectStore.project
  if (!project) return
  const imgMap = new Map(project.images.map(img => [img.id, img]))
  const palMap = new Map(project.palettes.map(p => [p.id, p]))
  renderSpriteThumbnail(el, sprite, imgMap, palMap)
}
</script>

<template>
  <AppDialog :open="open" title="Pick a Sprite" width="560px" @close="cancel">
    <div class="picker-body">
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Search sprites…"
        autocomplete="off"
      />

      <div class="groups-scroll">
        <div v-if="groups.length === 0" class="empty-state">
          No sprites found.
        </div>

        <div v-for="group in groups" :key="group.prefix ?? '__ungrouped__'" class="group">
          <button class="group-header" @click="toggleCollapse(group.prefix)">
            <span class="chevron" :class="{ collapsed: isCollapsed(group.prefix) }">▾</span>
            <span class="group-label">{{ group.prefix ?? 'Ungrouped' }}</span>
            <span class="group-count">{{ group.sprites.length }}</span>
          </button>

          <div v-show="!isCollapsed(group.prefix)" class="tile-grid">
            <button
              v-for="spr in group.sprites"
              :key="spr.id"
              class="tile"
              @click="select(spr.id)"
            >
              <canvas
                :ref="(el) => mountCanvas(el as HTMLCanvasElement | null, spr)"
                :width="SPRITE_THUMB_PX"
                :height="SPRITE_THUMB_PX"
                class="thumb"
              />
              <span class="tile-name">{{ spr.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #actions>
      <AppButton variant="default" @click="cancel">Cancel</AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.picker-body {
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-4);
  min-height: 0;
}

.search-input {
  width: 100%;
  padding: var(--rd-space-3) var(--rd-space-4);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text);
  font-size: var(--rd-text-12);
  outline: none;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--rd-color-accent);
}

.groups-scroll {
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--rd-space-2);
}

.empty-state {
  text-align: center;
  padding: var(--rd-space-8);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-12);
}

.group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-2) var(--rd-space-3);
  background: var(--rd-color-surface-3);
  border: none;
  border-radius: var(--rd-radius-2);
  color: var(--rd-color-text-muted);
  font-size: var(--rd-text-11);
  font-weight: var(--rd-weight-semibold);
  text-align: left;
  cursor: pointer;
  user-select: none;
}

.group-header:hover {
  background: var(--rd-color-surface-4);
  color: var(--rd-color-text);
}

.chevron {
  display: inline-block;
  transition: transform 120ms ease;
  font-size: 10px;
  line-height: 1;
}

.chevron.collapsed {
  transform: rotate(-90deg);
}

.group-label { flex: 1; }

.group-count {
  font-size: var(--rd-text-10);
  opacity: 0.6;
}

.tile-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rd-space-3);
  padding: var(--rd-space-3) var(--rd-space-2);
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--rd-space-2);
  padding: var(--rd-space-2);
  width: 84px;
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-2);
  cursor: pointer;
  color: var(--rd-color-text);
}

.tile:hover {
  background: var(--rd-color-surface-4);
  border-color: var(--rd-color-border-hover);
}

.thumb {
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  background: var(--rd-color-surface-1);
  border-radius: var(--rd-radius-1);
}

.tile-name {
  font-size: var(--rd-text-10);
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>
