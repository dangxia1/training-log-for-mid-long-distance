<script setup>
import { ref, computed, nextTick } from 'vue'
import { useTagStore } from '../stores/tagStore.js'
import { useTrainingStore } from '../stores/trainingStore.js'
import TrainingList from './TrainingList.vue'
import StarFilter from './StarFilter.vue'
import TrainingForm from './TrainingForm.vue'

const tagStore = useTagStore()
const trainingStore = useTrainingStore()
const starOnly = ref(false)
const editingId = ref(null)
const expandedIds = ref(new Set())

function selectTag(id) { tagStore.setActive(tagStore.activeTagId === id ? null : id) }
function toggleExpand(id) {
  expandedIds.value.has(id) ? expandedIds.value.delete(id) : expandedIds.value.add(id)
  expandedIds.value = new Set(expandedIds.value)
}

const tree = computed(() => {
  const tags = tagStore.tags; const map = new Map(); const roots = []
  tags.forEach(t => map.set(t.name, { tag: t, children: [] }))
  tags.forEach(t => {
    const idx = t.name.lastIndexOf('·')
    if (idx !== -1) { const p = map.get(t.name.slice(0, idx)); if (p) { p.children.push(map.get(t.name)); return } }
    roots.push(map.get(t.name))
  })
  return roots
})

const flatList = computed(() => {
  const list = []
  function walk(nodes, level) {
    nodes.forEach(n => {
      const hasKids = n.children.length > 0; const expanded = expandedIds.value.has(n.tag.id)
      list.push({ ...n, level, hasKids, expanded })
      if (hasKids && expanded) walk(n.children, level + 1)
    })
  }
  walk(tree.value, 0); return list
})

const activeTag = computed(() => tagStore.activeTagId ? tagStore.tags.find(t => t.id === tagStore.activeTagId) : null)
const tagRecords = computed(() => {
  if (!activeTag.value) return []
  const matchNames = tagStore.getDescendantNames(activeTag.value.name)
  let records = trainingStore.trainings.filter(t => t.tags.some(tn => matchNames.includes(tn)))
  records.sort((a, b) => new Date(b.date) - new Date(a.date))
  if (starOnly.value) records = records.filter(r => r.star)
  return records
})
const timeSince = computed(() => {
  const sorted = [...tagRecords.value].sort((a, b) => new Date(b.date) - new Date(a.date))
  if (!sorted.length) return '暂无记录'
  const diffMs = Date.now() - new Date(sorted[0].date).getTime()
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor((diffMs % 86400000) / 3600000)
  return `${days} 天 ${hours} 小时前`
})

function handleEdit(id) { editingId.value = id }
function handleDelete(id) { if (confirm('确定删除？')) trainingStore.remove(id) }
function handleToggleStar(id) {
  const r = trainingStore.trainings.find(t => t.id === id)
  if (r) trainingStore.update(id, { star: !r.star })
}

const newTagInput = ref(''); const showCreate = ref(false)
function createTag() {
  const name = newTagInput.value.trim(); if (!name) return
  const tag = tagStore.create(name); tagStore.setActive(tag.id)
  newTagInput.value = ''; showCreate.value = false
}
function onKeydown(e) {
  if (e.key === 'Enter') createTag()
  if (e.key === 'Escape') { newTagInput.value = ''; showCreate.value = false }
}
function deleteTag(id) {
  const tag = tagStore.tags.find(t => t.id === id); if (!tag) return
  if (!confirm(`确定删除标签"${tag.name}"？`)) return; tagStore.remove(id)
}

const renamingId = ref(null); const renameInput = ref(''); const renameInputEl = ref(null)
async function startRename(id) {
  const tag = tagStore.tags.find(t => t.id === id); if (!tag) return
  renamingId.value = id; renameInput.value = tag.name; await nextTick(); renameInputEl.value?.focus()
}
function setRenameRef(el) { renameInputEl.value = el }
function finishRename() {
  if (!renamingId.value) return; const name = renameInput.value.trim()
  if (name) {
    const oldName = tagStore.rename(renamingId.value, name)
    if (oldName) {
      trainingStore.trainings.forEach(t => {
        const idx = t.tags.indexOf(oldName)
        if (idx !== -1) { const tags = [...t.tags]; tags[idx] = name; trainingStore.update(t.id, { tags }) }
      })
    }
  }
  renamingId.value = null; renameInput.value = ''
}
function cancelRename() { renamingId.value = null; renameInput.value = '' }
</script>

<template>
  <div class="tags-view">
    <!-- Tag directory sidebar -->
    <aside class="tag-directory">
      <p class="directory-title">训练分类</p>
      <div class="tag-tree">
        <button v-for="item in flatList" :key="item.tag.id" class="tag-row" :class="{ active: tagStore.activeTagId === item.tag.id }" :style="{ paddingLeft: (12 + item.level * 20) + 'px' }" @click="selectTag(item.tag.id)">
          <span v-if="item.hasKids" class="expand-arrow" :class="{ open: item.expanded }" @click.stop="toggleExpand(item.tag.id)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
          <span v-else class="expand-arrow placeholder"></span>
          <span class="tag-dot" :style="{ background: item.tag.color }"></span>
          <input v-if="renamingId === item.tag.id" :ref="setRenameRef" v-model="renameInput" class="rename-input" @click.stop @keydown.enter.stop="finishRename" @keydown.escape.stop="cancelRename" @blur="finishRename" />
          <span v-else class="tag-label" @dblclick.stop="startRename(item.tag.id)" :title="item.tag.name">{{ item.tag.name.slice(item.tag.name.lastIndexOf('·') + 1) }}</span>
          <button class="tag-del" @click.stop="deleteTag(item.tag.id)" title="删除">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </button>
      </div>
      <div class="add-area">
        <button v-if="!showCreate" class="btn-dashed" @click="showCreate = true">+ 新标签</button>
        <input v-else v-model="newTagInput" class="new-input" placeholder="标签名（· 分隔层级）" @keydown="onKeydown" />
      </div>
    </aside>

    <!-- Records -->
    <main class="tag-main">
      <div v-if="activeTag" class="tag-view">
        <div class="view-header">
          <div class="view-title-row">
            <span class="tag-dot-lg" :style="{ background: activeTag.color }"></span>
            <h2 class="view-title">{{ activeTag.name }}</h2>
            <span class="count-badge">{{ tagRecords.length }} 条</span>
          </div>
          <div class="stats-bar">
            <span class="stats-label">上次训练：{{ timeSince }}</span>
            <StarFilter v-model="starOnly" />
          </div>
        </div>
        <TrainingList :records="tagRecords" @edit="handleEdit" @delete="handleDelete" @toggle-star="handleToggleStar" />
      </div>
      <div v-else class="empty-state">
        <p class="empty-headline">选择分类</p>
        <p class="empty-sub">从左侧目录中选择一个标签，查看对应训练记录</p>
      </div>
    </main>

    <TrainingForm v-if="editingId" :edit-id="editingId" @close="editingId = null" />
  </div>
</template>

<style scoped>
.tags-view { display: flex; gap: 32px; }

/* ---- Directory ---- */
.tag-directory {
  width: 240px; flex-shrink: 0;
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-md); padding: 20px 12px 12px;
  display: flex; flex-direction: column; box-shadow: var(--shadow-sm);
  max-height: calc(100dvh - 160px); overflow-y: auto;
  position: sticky; top: 96px;
}
.directory-title {
  font-family: var(--font-display); font-size: 0.75rem; font-weight: 600;
  color: var(--text-tertiary); letter-spacing: 0.06em;
  text-transform: uppercase; margin-bottom: 12px; padding: 0 8px;
}

.tag-tree { flex: 1; }
.tag-row {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 8px 10px; border: none; border-radius: var(--radius-sm);
  background: transparent; cursor: pointer;
  font-size: 0.82rem; font-family: var(--font-body); color: var(--text-secondary);
  transition: background var(--dur-fast) var(--ease-out);
  margin-bottom: 1px;
}
.tag-row:hover { background: var(--bg-hover); }
.tag-row.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.tag-row:active { transform: scale(0.98); }

.expand-arrow { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); flex-shrink: 0; transition: transform var(--dur-fast) var(--ease-out); }
.expand-arrow.open { transform: rotate(90deg); }
.expand-arrow.placeholder { visibility: hidden; }

.tag-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tag-label { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag-del {
  display: none; width: 20px; height: 20px; border: none; border-radius: 3px;
  background: transparent; color: var(--text-tertiary); cursor: pointer;
  align-items: center; justify-content: center; flex-shrink: 0;
  transition: color var(--dur-fast) var(--ease-out);
}
.tag-row:hover .tag-del { display: flex; }
.tag-del:hover { color: var(--danger); }
.tag-row.active .tag-del { color: var(--accent); }
.rename-input {
  flex: 1; padding: 2px 6px; border: 1px solid var(--accent); border-radius: 3px;
  font-size: 0.8rem; font-family: var(--font-body); outline: none;
  background: var(--bg-card); min-width: 0;
}

.add-area { margin-top: 8px; padding: 0 4px; }
.btn-dashed { font-size: 0.78rem; }
.new-input {
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--accent); border-radius: var(--radius-sm);
  font-size: 0.82rem; font-family: var(--font-body); outline: none;
  background: var(--bg-card);
}

/* ---- Main ---- */
.tag-main { flex: 1; overflow-y: auto; }
.tag-view { display: flex; flex-direction: column; gap: 24px; }

.view-header { display: flex; flex-direction: column; gap: 16px; }
.view-title-row { display: flex; align-items: center; gap: 12px; }
.tag-dot-lg { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.view-title {
  font-family: var(--font-display); font-size: 1.5rem; font-weight: 700;
  letter-spacing: 0.02em; color: var(--text-primary);
}
.count-badge {
  font-size: 0.72rem; padding: 2px 10px; border-radius: 12px;
  background: var(--bg-surface); color: var(--text-tertiary);
  font-weight: 500; letter-spacing: 0.02em;
}

.stats-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px;
  background: var(--bg-card); border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 0.85rem; color: var(--text-secondary);
}
.stats-label { font-family: var(--font-display); font-style: italic; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 12px; padding-top: 80px;
}
.empty-headline {
  font-family: var(--font-display); font-size: 1.6rem; font-weight: 600;
  color: var(--text-tertiary); font-style: italic;
}
.empty-sub { font-size: 0.9rem; color: var(--text-placeholder); }

@media (max-width: 768px) {
  .tags-view { flex-direction: column; }
  .tag-directory { width: 100%; max-height: none; position: static; }
}
</style>
