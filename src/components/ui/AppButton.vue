<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'accent' | 'muted'
  size?: 'default' | 'compact' | 'icon'
}>()
</script>

<template>
  <button class="btn" :class="[variant ?? 'default', size ?? 'default']">
    <slot />
  </button>
</template>

<style scoped>
.btn {
  font-family: inherit;
  font-size: var(--rd-text-12);
  background: var(--rd-color-surface-3);
  border: var(--rd-border-w) solid var(--rd-color-border);
  border-radius: var(--rd-radius-1);
  color: var(--rd-color-text);
  cursor: pointer;
  padding: 5px 12px;
}
.btn:hover:not(:disabled) { background: var(--rd-color-surface-2); border-color: var(--rd-color-text-muted); }
.btn:focus-visible { outline: none; border-color: var(--rd-color-accent); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* --- Variants (each hover must fully override the base hover) --- */

.primary {
  background: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
  font-weight: var(--rd-weight-semibold);
}
.primary:hover:not(:disabled) { background: var(--rd-color-accent-hover); border-color: var(--rd-color-accent-hover); }

.danger {
  background: var(--rd-color-danger);
  border-color: var(--rd-color-danger);
  color: var(--rd-color-danger-fg);
  font-weight: var(--rd-weight-semibold);
}
.danger:hover:not(:disabled) { background: var(--rd-color-danger); border-color: var(--rd-color-danger); opacity: 0.85; }

.ghost { background: none; }
.ghost:hover:not(:disabled) { background: var(--rd-color-surface-2); border-color: var(--rd-color-border); }

.accent {
  background: var(--rd-color-accent-soft);
  border-color: var(--rd-color-accent-soft-border);
  color: var(--rd-color-accent);
}
.accent:hover:not(:disabled) {
  background: var(--rd-color-accent);
  border-color: var(--rd-color-accent);
  color: var(--rd-color-accent-fg);
}

.muted { background: none; border-color: transparent; color: var(--rd-color-text-muted); }
.muted:hover:not(:disabled) { background: var(--rd-color-surface-3); border-color: transparent; color: var(--rd-color-text); }

/* --- Sizes --- */

.compact { padding: 3px var(--rd-space-5); font-size: var(--rd-text-11); }
.icon    { padding: 0 var(--rd-space-3); line-height: 1; }
</style>
