<script setup>
import { useTheme } from '../composables/useTheme.js'

const { theme, themes, setTheme } = useTheme()
</script>

<template>
  <div class="theme-toggle">
    <button
      v-for="t in themes" :key="t.id"
      class="theme-btn"
      :class="{ active: theme === t.id }"
      :title="t.label"
      @click="setTheme(t.id)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  gap: 3px;
  padding: 2px 0;
}

.theme-btn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--sidebar-text-dim);
  font-size: 0.7rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.theme-btn:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text);
}

.theme-btn.active {
  background: var(--sidebar-active);
  color: var(--sidebar-text);
  font-weight: 600;
  border-color: rgba(255,255,255,0.12);
}
</style>
