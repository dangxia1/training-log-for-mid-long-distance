<script setup>
import { ref, computed, nextTick } from 'vue'
import PlanView from './components/PlanView.vue'
import TrainingPlan from './components/TrainingPlan.vue'
import TrainingTypeView from './components/TrainingTypeView.vue'
import TrainingForm from './components/TrainingForm.vue'
import DataIO from './components/DataIO.vue'

const activeTab = ref('dailyplan')
const showDataIO = ref(false)
const showTrainingForm = ref(false)

const defaults = [
  { key: 'dailyplan', label: '计划', icon: 'dailyplan' },
  { key: 'plan', label: '思路', icon: 'plan' },
  { key: 'tags', label: '类型', icon: 'tags' },
]

// ---- localStorage loaders ----
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

const customLabels = ref(loadJSON('training-log-tab-labels', {}))
const customOrder = ref(loadJSON('training-log-tab-order', []))

const allTabs = computed(() => {
  const list = defaults.map(d => ({ ...d, label: customLabels.value[d.key] || d.label }))
  const order = customOrder.value
  if (order.length) {
    list.sort((a, b) => {
      const ai = order.indexOf(a.key), bi = order.indexOf(b.key)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }
  return list
})

// ---- dark mode ----
const isDark = ref(loadJSON('training-log-theme', { dark: false }).dark)
function toggleDark() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : '')
  saveJSON('training-log-theme', { dark: isDark.value })
}
// init
if (isDark.value) document.documentElement.setAttribute('data-theme', 'dark')

// ---- label editing ----
const editingTab = ref(null)
const editInputRefs = ref({})

function startEdit(tab) {
  editingTab.value = tab.key
  nextTick(() => editInputRefs.value[tab.key]?.focus())
}
function finishEdit(tab) {
  if (!tab.label.trim()) tab.label = defaults.find(d => d.key === tab.key).label
  editingTab.value = null
  customLabels.value[tab.key] = tab.label
  saveJSON('training-log-tab-labels', customLabels.value)
}
</script>

<template>
  <div class="app-shell">
    <!-- Masthead navigation -->
    <header class="masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <h1 class="masthead-title">训练日志</h1>
          <span class="masthead-kicker">Training Journal</span>
        </div>

        <nav class="masthead-nav">
          <button
            v-for="t in allTabs" :key="t.key"
            class="masthead-link"
            :class="{ active: activeTab === t.key }"
            @click="activeTab = t.key"
            @dblclick="startEdit(t)"
          >
            <input
              v-if="editingTab === t.key"
              :ref="el => { if (el) editInputRefs[t.key] = el }"
              v-model="t.label"
              class="nav-label-input"
              @click.stop
              @keydown.enter="finishEdit(t)"
              @blur="finishEdit(t)"
            />
            <span v-else>{{ t.label }}</span>
          </button>
        </nav>

        <div class="masthead-actions">
          <button class="masthead-btn" @click="showDataIO = true" title="数据管理">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button class="masthead-btn theme-btn" @click="toggleDark" :title="isDark ? '亮色模式' : '深色模式'">
            <!-- Sun icon -->
            <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <!-- Moon icon -->
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main content — editorial grid -->
    <main class="editorial-main">
      <div class="editorial-container">
        <PlanView v-if="activeTab === 'dailyplan'" />
        <TrainingPlan v-else-if="activeTab === 'plan'" />
        <TrainingTypeView v-else-if="activeTab === 'tags'" />
      </div>
    </main>

    <!-- FAB -->
    <button class="fab" @click="showTrainingForm = true" title="新增训练记录">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <DataIO v-if="showDataIO" @close="showDataIO = false" />
    <TrainingForm v-if="showTrainingForm" @close="showTrainingForm = false" />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-body);
  background: var(--bg-body);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-numeric: tabular-nums;
  line-height: 1.6;
}

.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ---- Masthead ---- */
.masthead {
  position: sticky; top: 0; z-index: var(--z-nav);
  background: var(--bg-body);
  border-bottom: 1px solid var(--border-hairline);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.masthead-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 40px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 40px;
}

.masthead-brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-shrink: 0;
}
.masthead-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  line-height: 1;
}
.masthead-kicker {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-style: italic;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

.masthead-nav {
  flex: 1;
  display: flex;
  gap: 4px;
  justify-content: center;
}
.masthead-link {
  padding: 8px 20px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
  letter-spacing: 0.01em;
}
.masthead-link:hover { color: var(--text-primary); background: var(--bg-hover); }
.masthead-link.active {
  color: var(--accent);
  font-weight: 600;
}
.masthead-link:active { transform: scale(0.97); }

.nav-label-input {
  width: 60px;
  padding: 2px 6px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  background: var(--bg-card);
  color: var(--text-primary);
  outline: none;
}

.masthead-actions {
  display: flex; gap: 6px; flex-shrink: 0;
}
.masthead-btn {
  width: 34px; height: 34px;
  border: none; border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.masthead-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
.masthead-btn:active { transform: scale(0.94); }

/* ---- Editorial main ---- */
.editorial-main {
  flex: 1;
  overflow-y: auto;
}
.editorial-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 40px 60px;
}

/* ---- FAB ---- */
.fab {
  position: fixed;
  bottom: 32px; right: 32px;
  width: 54px; height: 54px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-md);
  transition: transform var(--dur-normal) var(--ease-editorial), box-shadow var(--dur-normal) var(--ease-editorial);
  z-index: var(--z-fab);
}
.fab:hover { transform: scale(1.06); box-shadow: var(--shadow-lg); }
.fab:active { transform: scale(0.94); }

/* ---- Scrollbar ---- */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }

/* ---- Grain overlay ---- */
.app-shell::after {
  content: '';
  position: fixed; inset: 0; z-index: 9999; pointer-events: none;
  opacity: 0.018;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .app-shell::after { display: none; }
  .masthead { backdrop-filter: none; -webkit-backdrop-filter: none; }
}

@media (max-width: 768px) {
  .masthead-inner { padding: 0 16px; gap: 16px; }
  .masthead-kicker { display: none; }
  .masthead-link { padding: 8px 12px; font-size: 0.8rem; }
  .editorial-container { padding: 24px 16px 40px; }
}
</style>
