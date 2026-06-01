<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const ORDER_KEY = 'training-log-docs-order'
function loadOrder() { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '{}') } catch { return {} } }
function saveOrder(o) { localStorage.setItem(ORDER_KEY, JSON.stringify(o)) }
import { marked } from 'marked'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import { loadPlan, savePlan, clearSections } from '../utils/storage.js'

// ---- marked configuration ----
marked.setOptions({ breaks: true, gfm: true })

try { mermaid.initialize({ startOnLoad: false, theme: 'neutral' }) } catch {}

function safeHljsHighlight(code, lang) {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  } catch { return code.replace(/</g, '&lt;').replace(/>/g, '&gt;') }
}

function safeKatexRender(tex, displayMode) {
  try { return katex.renderToString(tex, { displayMode, throwOnError: false }) } catch { return null }
}

// ---- marked extensions ----
marked.use({
  name: 'mermaid-ph',
  renderer: {
    code(token) {
      if (token.lang === 'mermaid') return `M${token.text}`
      return false
    }
  }
})

marked.use({
  name: 'highlight',
  renderer: {
    code(token) {
      if (token.lang === 'mermaid') return false
      const html = safeHljsHighlight(token.text, token.lang)
      const langClass = token.lang ? ` language-${token.lang}` : ''
      return `<pre><code class="hljs${langClass}">${html}</code></pre>`
    }
  }
})

// ---- KaTeX math pre-processing ----
function renderMath(md) {
  const blocks = [], inlines = []
  md = md.replace(/\$\$([\s\S]*?)\$\$/g, (m, tex) => {
    const rendered = safeKatexRender(tex.trim(), true)
    blocks.push(rendered || m)
    return `B${blocks.length - 1}`
  })
  md = md.replace(/(^|\s)\$([^$\s][^$\n]*?)\$/g, (m, prefix, tex) => {
    const rendered = safeKatexRender(tex.trim(), false)
    inlines.push(rendered || m)
    return `${prefix}I${inlines.length - 1}`
  })
  return { md, blocks, inlines }
}

// ---- week table (cells in localStorage, unchanged) ----
const plan = ref({ cells: ['', '', '', '', '', '', ''] })
let cellSaveTimer = null
function scheduleCellSave() {
  clearTimeout(cellSaveTimer)
  cellSaveTimer = setTimeout(() => {
    savePlan({ cells: plan.value.cells, sections: [] })
  }, 400)
}

// init cells from localStorage
const savedPlan = loadPlan()
if (savedPlan.cells) plan.value.cells = savedPlan.cells

// ---- editable titles ----
function loadTitles() {
  try { return JSON.parse(localStorage.getItem('training-log-titles') || '{}') } catch { return {} }
}
function saveTitles(t) { localStorage.setItem('training-log-titles', JSON.stringify(t)) }

const titles = ref(loadTitles())
function titleVal(key, fallback) { return titles.value[key] || fallback }
const editingPageTitle = ref(null)
const pageTitleInputRefs = ref({})

function startEditPageTitle(key) {
  editingPageTitle.value = key
  nextTick(() => pageTitleInputRefs.value[key]?.focus())
}
function finishEditPageTitle(key) {
  editingPageTitle.value = null
  saveTitles(titles.value)
}

// ---- day labels ----
const dayDefaults = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function dayLabel(i) { return titles.value[`day-${i}`] || dayDefaults[i] }

// ---- file tree ----
const fileTree = ref(null)
const activeFilePath = ref(null)
const fileContent = ref('')
const isLoading = ref(true)
const backendError = ref(false)
const expandedFolders = ref(new Set())
const editingFilePath = ref(null)
const editNameRefs = ref({})

// ---- new file/folder creation ----
const creating = ref(null)        // 'file' | 'folder' | null
const newItemName = ref('')
const createInputRef = ref(null)
const creatingInFolder = ref('')  // parent folder path for new item

// ---- editor mode ----
const editorMode = ref('edit')

// ---- async markdown → HTML pipeline ----
const renderedMd = ref('')
let renderSeq = 0

async function renderMarkdown() {
  const seq = ++renderSeq
  const content = fileContent.value || ''
  try {
    // phase 1: KaTeX (sync)
    const { md, blocks: mathB, inlines: mathI } = renderMath(content)
    // phase 2: marked (sync) — produces mermaid placeholders
    let html = marked.parse(md)
    // phase 3: restore KaTeX (sync)
    html = html.replace(/B(\d+)/g, (_, i) => mathB[+i])
    html = html.replace(/I(\d+)/g, (_, i) => mathI[+i])
    // phase 4: extract mermaid blocks + render as SVG (async)
    const mermaidRe = /M([\s\S]*?)/g
    const mList = []
    html = html.replace(mermaidRe, (_, code) => { mList.push(code); return `M${mList.length - 1}` })
    for (let i = 0; i < mList.length; i++) {
      if (seq !== renderSeq) return
      try {
        const { svg } = await mermaid.render(`m${seq}-${i}`, mList[i])
        html = html.replace(`M${i}`, `<div class="mermaid-svg">${svg}</div>`)
      } catch {
        html = html.replace(`M${i}`, `<pre class="mermaid-error">${mList[i].replace(/</g, '&lt;')}</pre>`)
      }
    }
    if (seq === renderSeq) renderedMd.value = html
  } catch (e) {
    console.warn('Markdown render error:', e.message)
    if (seq === renderSeq) renderedMd.value = marked.parse(content)
  }
}

watch(fileContent, () => renderMarkdown(), { immediate: true })

// ---- save state ----
let fileSaveTimer = null
const saving = ref(false)

// ---- drag & drop / order ----
const fileOrder = ref(loadOrder())
const dragPath = ref(null)
const dragOverPath = ref(null)

function parentPath(p) {
  const idx = p.lastIndexOf('/')
  return idx === -1 ? '' : p.substring(0, idx)
}

function applyOrder(nodes, parent) {
  const order = fileOrder.value[parent] || []
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    const ai = order.indexOf(a.name), bi = order.indexOf(b.name)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
  for (const n of nodes) {
    if (n.type === 'folder' && n.children) applyOrder(n.children, n.path)
  }
}

function onTreeDragStart(e, item) {
  dragPath.value = item.path
  e.dataTransfer.effectAllowed = 'move'
  e.target.classList.add('dragging')
}
function onTreeDragEnd(e) {
  dragPath.value = null
  dragOverPath.value = null
  e.target.classList.remove('dragging')
}
function onTreeDragOver(e, item) {
  e.preventDefault()
  if (!dragPath.value || dragPath.value === item.path) return
  if (parentPath(dragPath.value) !== parentPath(item.path)) return
  e.dataTransfer.dropEffect = 'move'
  dragOverPath.value = item.path
}
function onTreeDrop(e, targetItem) {
  e.preventDefault()
  dragOverPath.value = null
  if (!dragPath.value || dragPath.value === targetItem.path) return
  const srcParent = parentPath(dragPath.value)
  const tgtParent = parentPath(targetItem.path)
  if (srcParent !== tgtParent) return

  const children = getChildrenByParent(srcParent)
  const srcName = dragPath.value.includes('/') ? dragPath.value.substring(dragPath.value.lastIndexOf('/') + 1) : dragPath.value
  const tgtName = targetItem.path.includes('/') ? targetItem.path.substring(targetItem.path.lastIndexOf('/') + 1) : targetItem.path

  const arr = [...(fileOrder.value[srcParent] || [])]
  // ensure all current children are in the order
  for (const c of children) {
    if (!arr.includes(c.name)) arr.push(c.name)
  }
  const srcIdx = arr.indexOf(srcName)
  const tgtIdx = arr.indexOf(tgtName)
  if (srcIdx === -1 || tgtIdx === -1) return
  arr.splice(srcIdx, 1)
  arr.splice(tgtIdx, 0, srcName)
  fileOrder.value[srcParent] = arr
  saveOrder(fileOrder.value)
  // re-sort (applyOrder recurses into all nested levels)
  applyOrder(fileTree.value.children, '')
  dragPath.value = null
}

function getChildrenByParent(parent) {
  if (parent === '') return fileTree.value?.children || []
  // find folder node by path
  function find(nodes, p) {
    for (const n of nodes) {
      if (n.type === 'folder' && n.path === p) return n.children || []
      if (n.type === 'folder' && n.children) {
        const r = find(n.children, p)
        if (r) return r
      }
    }
    return null
  }
  return find(fileTree.value?.children || [], parent) || []
}

// ---- flat tree for rendering ----
function flattenTree(nodes, level = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ ...node, level })
    if (node.type === 'folder' && expandedFolders.value.has(node.path)) {
      result.push(...flattenTree(node.children, level + 1))
    }
  }
  return result
}

const flatTree = computed(() => {
  if (!fileTree.value) return []
  return flattenTree(fileTree.value.children || [])
})

// ---- API helpers ----
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---- file operations ----
async function fetchTree() {
  fileTree.value = await api('/api/docs/tree')
  applyOrder(fileTree.value.children, '')
  backendError.value = false
}

async function openFile(filePath) {
  const data = await api(`/api/docs/file?path=${encodeURIComponent(filePath)}`)
  fileContent.value = data.content
  activeFilePath.value = filePath
}

function scheduleFileSave() {
  clearTimeout(fileSaveTimer)
  fileSaveTimer = setTimeout(() => doFileSave(), 600)
}

async function doFileSave() {
  if (!activeFilePath.value) return
  saving.value = true
  try {
    await api('/api/docs/file', {
      method: 'PUT',
      body: JSON.stringify({ path: activeFilePath.value, content: fileContent.value })
    })
  } catch (e) {
    console.error('Save failed:', e)
  } finally {
    saving.value = false
  }
}

function onContentInput() {
  scheduleFileSave()
}

async function createItem() {
  const name = newItemName.value.trim()
  if (!name) { cancelCreate(); return }

  const parentPath = creatingInFolder.value
  const relPath = parentPath ? `${parentPath}/${name}` : name

  try {
    if (creating.value === 'file') {
      const finalName = name.endsWith('.md') ? name : `${name}.md`
      const finalPath = parentPath ? `${parentPath}/${finalName}` : finalName
      await api('/api/docs/file', {
        method: 'POST',
        body: JSON.stringify({ path: finalPath })
      })
    } else {
      await api('/api/docs/folder', {
        method: 'POST',
        body: JSON.stringify({ path: relPath })
      })
    }
    cancelCreate()
    await fetchTree()
  } catch (e) {
    alert(`创建失败: ${e.message}`)
  }
}

function cancelCreate() {
  creating.value = null
  newItemName.value = ''
  creatingInFolder.value = ''
}

function startCreate(type, folderPath = '') {
  creating.value = type
  creatingInFolder.value = folderPath
  newItemName.value = ''
  nextTick(() => createInputRef.value?.focus())
}

async function deleteItem(node) {
  const label = node.type === 'folder' ? `文件夹 "${node.name}"` : `文件 "${node.name}"`
  if (!confirm(`确定删除${label}？`)) return
  try {
    if (node.type === 'folder') {
      // use rename to "move" — actually we need a delete folder endpoint
      // For now, only support deleting individual files
      alert('暂不支持删除文件夹')
      return
    }
    await api(`/api/docs/file?path=${encodeURIComponent(node.path)}`, { method: 'DELETE' })
    if (activeFilePath.value === node.path) {
      activeFilePath.value = null
      fileContent.value = ''
    }
    await fetchTree()
  } catch (e) {
    alert(`删除失败: ${e.message}`)
  }
}

const isRenaming = ref(false)

function startRename(item) {
  editingFilePath.value = item.path
  nextTick(() => editNameRefs.value[item.path]?.focus())
}

async function finishRename(oldPath) {
  if (isRenaming.value) return
  editingFilePath.value = null
  const inputEl = editNameRefs.value[oldPath]
  if (!inputEl) return
  const newName = inputEl.value.trim()
  if (!newName) return

  // build new path
  const dir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : ''
  const newPath = dir ? `${dir}/${newName}` : newName

  if (oldPath === newPath) return

  isRenaming.value = true
  try {
    await api('/api/docs/rename', {
      method: 'PUT',
      body: JSON.stringify({ oldPath, newPath })
    })
    if (activeFilePath.value === oldPath) {
      activeFilePath.value = newPath
    }
    await fetchTree()
  } catch (e) {
    alert(`重命名失败: ${e.message}`)
    await fetchTree()
  } finally {
    isRenaming.value = false
  }
}

function onRenameKeydown(e, oldPath) {
  if (e.key === 'Enter') { e.preventDefault(); finishRename(oldPath) }
  if (e.key === 'Escape') { editingFilePath.value = null }
}

function toggleFolder(folderPath) {
  const s = new Set(expandedFolders.value)
  if (s.has(folderPath)) s.delete(folderPath)
  else s.add(folderPath)
  expandedFolders.value = s
}

// ---- close menu on outside click ----
const showNewMenu = ref(false)
const newMenuBtnRef = ref(null)

function onDocClick(e) {
  if (newMenuBtnRef.value && !newMenuBtnRef.value.contains(e.target)) {
    showNewMenu.value = false
  }
}

// ---- migration ----
async function migrateSections() {
  if (localStorage.getItem('training-log-migrated')) return

  const saved = loadPlan()
  const sections = saved.sections || []
  const hasContent = sections.some(s => s.content && s.content.trim())

  if (!hasContent) {
    localStorage.setItem('training-log-migrated', '1')
    return
  }

  for (const s of sections) {
    if (!s.content || !s.content.trim()) continue
    const fileName = (s.title || '未命名').replace(/[\/\\:*?"<>|]/g, '-')
    let filePath = `${fileName}.md`
    // handle duplicate names
    let counter = 1
    while (true) {
      try {
        await api('/api/docs/file', {
          method: 'POST',
          body: JSON.stringify({ path: filePath, content: s.content })
        })
        break
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('409')) {
          filePath = `${fileName}_${counter}.md`
          counter++
        } else {
          throw e
        }
      }
    }
  }

  // clear sections from localStorage, keep cells
  clearSections()
  localStorage.setItem('training-log-migrated', '1')
  await fetchTree()
}

// ---- init ----
function findFirstFile(nodes) {
  for (const node of nodes) {
    if (node.type === 'file') return node.path
    if (node.type === 'folder' && node.children?.length) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  try {
    await fetchTree()
    await migrateSections()
    // auto-open first file in preview mode
    const firstFile = findFirstFile(fileTree.value?.children || [])
    if (firstFile && !activeFilePath.value) {
      await openFile(firstFile)
      editorMode.value = 'preview'
    }
  } catch {
    backendError.value = true
  }
  isLoading.value = false
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  doFileSave()
})
</script>

<template>
  <div class="plan">
    <!-- ====== left sidebar: file tree ====== -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <input
          v-if="editingPageTitle === 'sections'"
          :ref="el => { if (el) pageTitleInputRefs['sections'] = el }"
          v-model="titles['sections']"
          class="sidebar-title-input"
          @keydown.enter="finishEditPageTitle('sections')"
          @blur="finishEditPageTitle('sections')"
        />
        <span v-else class="sidebar-title" @dblclick="startEditPageTitle('sections')">{{ titleVal('sections', '文档') }}</span>
        <div class="btn-add-wrap" :ref="el => newMenuBtnRef = el">
          <button class="btn-add" @click.stop="showNewMenu = !showNewMenu" title="新建">+</button>
          <div v-if="showNewMenu" class="new-menu">
            <button class="new-menu-item" @click.stop="showNewMenu = false; startCreate('file')">新建文件</button>
            <button class="new-menu-item" @click.stop="showNewMenu = false; startCreate('folder')">新建文件夹</button>
          </div>
        </div>
      </div>

      <!-- loading -->
      <div v-if="isLoading" class="tree-status">加载中...</div>

      <!-- backend error -->
      <div v-else-if="backendError" class="tree-status error">
        <p>无法连接服务器</p>
        <p class="error-hint">请确保后端服务已启动<br/>(npm run dev:server)</p>
      </div>

      <!-- empty -->
      <div v-else-if="!flatTree.length && !creating" class="tree-status">暂无文档，点击 + 新建</div>

      <!-- file tree -->
      <div v-else class="file-tree">
        <!-- creation input -->
        <div v-if="creating" class="tree-item create-item">
          <span class="tree-icon">{{ creating === 'file' ? '▹' : '▸' }}</span>
          <input
            :ref="el => { if (el) createInputRef = el }"
            v-model="newItemName"
            class="tree-name-input"
            :placeholder="creating === 'file' ? '文件名.md' : '文件夹名'"
            @keydown.enter="createItem()"
            @keydown.escape="cancelCreate()"
            @blur="createItem()"
          />
        </div>

        <div
          v-for="item in flatTree"
          :key="item.path"
          class="tree-item"
          :class="{ active: activeFilePath === item.path, 'drag-over': dragOverPath === item.path }"
          :style="{ paddingLeft: (12 + item.level * 16) + 'px' }"
          draggable="true"
          @dragstart="onTreeDragStart($event, item)"
          @dragend="onTreeDragEnd($event)"
          @dragover="onTreeDragOver($event, item)"
          @drop="onTreeDrop($event, item)"
        >
          <span class="drag-handle" title="拖拽排序">⋮⋮</span>
          <!-- folder arrow + name -->
          <template v-if="item.type === 'folder'">
            <span class="tree-arrow" @click="toggleFolder(item.path)">{{ expandedFolders.has(item.path) ? '▾' : '▸' }}</span>
            <span class="tree-folder-name" @click="toggleFolder(item.path)" @dblclick.stop="startRename(item)">{{ item.name }}</span>
          </template>

          <!-- file row -->
          <template v-else>
            <span class="tree-file-icon">▹</span>
            <input
              v-if="editingFilePath === item.path"
              :ref="el => { if (el) editNameRefs[item.path] = el }"
              :value="item.name"
              class="tree-name-input"
              @keydown="onRenameKeydown($event, item.path)"
              @blur="finishRename(item.path)"
              @click.stop
            />
            <span v-else class="tree-name" @click="openFile(item.path)" @dblclick="startRename(item)">{{ item.name }}</span>
            <button
              class="tree-remove"
              title="删除"
              @click.stop="deleteItem(item)"
            >×</button>
          </template>
        </div>
      </div>
    </aside>

    <!-- ====== right main ====== -->
    <div class="main">
      <!-- week table title -->
      <input
        v-if="editingPageTitle === 'plan'"
        :ref="el => { if (el) pageTitleInputRefs['plan'] = el }"
        v-model="titles['plan']"
        class="title-input"
        @keydown.enter="finishEditPageTitle('plan')"
        @blur="finishEditPageTitle('plan')"
      />
      <h3 v-else class="title" @dblclick="startEditPageTitle('plan')">{{ titleVal('plan', '训练思路') }}</h3>

      <table class="week-table">
        <thead>
          <tr>
            <th v-for="(d, i) in dayDefaults" :key="i" @dblclick="startEditPageTitle(`day-${i}`)">
              <input
                v-if="editingPageTitle === `day-${i}`"
                :ref="el => { if (el) pageTitleInputRefs[`day-${i}`] = el }"
                v-model="titles[`day-${i}`]"
                class="day-title-input"
                @keydown.enter="finishEditPageTitle(`day-${i}`)"
                @blur="finishEditPageTitle(`day-${i}`)"
                @click.stop
              />
              <span v-else>{{ dayLabel(i) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td v-for="(d, i) in dayDefaults" :key="i">
              <input
                v-model="plan.cells[i]"
                class="cell-input"
                @input="scheduleCellSave"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ====== file editor ====== -->
      <div v-if="activeFilePath" class="section-detail">
        <div class="file-header">
          <span class="file-name">{{ activeFilePath }}</span>
          <span v-if="saving" class="saving-indicator">保存中...</span>
        </div>
        <div class="tab-bar">
          <button
            class="tab-btn"
            :class="{ active: editorMode === 'edit' }"
            @click="editorMode = 'edit'"
          >编辑</button>
          <button
            class="tab-btn"
            :class="{ active: editorMode === 'preview' }"
            @click="editorMode = 'preview'"
          >预览</button>
        </div>

        <div v-show="editorMode === 'edit'" class="editor-wrap">
          <textarea
            v-model="fileContent"
            class="editor"
            placeholder="用 Markdown 编写文档..."
            @input="onContentInput"
          ></textarea>
        </div>

        <div
          v-show="editorMode === 'preview'"
          class="preview markdown-body"
          v-html="renderedMd"
        ></div>
      </div>

      <div v-else class="section-detail section-empty">
        <p>← 从左侧选择一个文件打开</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan { flex: 1; display: flex; overflow: hidden; gap: 24px; }

/* ---- sidebar ---- */
.sidebar {
  width: 210px; flex-shrink: 0;
  border: 1px solid var(--border-light); border-radius: var(--radius-md);
  background: var(--bg-card); display: flex; flex-direction: column; overflow-y: auto;
  box-shadow: var(--shadow-sm);
}

.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 14px 10px; position: relative;
}
.sidebar-title {
  font-family: var(--font-display); font-size: 0.72rem; font-weight: 600;
  color: var(--text-tertiary); letter-spacing: 0.06em; text-transform: uppercase; cursor: default;
}
.sidebar-title-input {
  flex: 1; padding: 3px 8px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
  font-size: 0.72rem; font-family: var(--font-body); font-weight: 600;
  color: var(--text-primary); background: var(--bg-card); outline: none;
}

.btn-add-wrap { position: relative; }
.btn-add {
  width: 26px; height: 26px; border: 1px dashed var(--border); border-radius: var(--radius-sm);
  background: transparent; color: var(--text-tertiary); font-size: 0.9rem; font-weight: 600;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.btn-add:hover { border-color: var(--accent); color: var(--accent); }

.new-menu {
  position: absolute; top: 100%; right: 0; margin-top: 4px;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md); z-index: 20; overflow: hidden; min-width: 110px;
}
.new-menu-item {
  display: block; width: 100%; padding: 8px 14px; border: none; background: transparent;
  color: var(--text-primary); font-size: 0.8rem; font-family: var(--font-body);
  cursor: pointer; text-align: left; transition: background var(--dur-fast) var(--ease-out);
}
.new-menu-item:hover { background: var(--bg-hover); }

/* ---- tree ---- */
.tree-status { font-size: 0.75rem; color: var(--text-placeholder); padding: 16px; text-align: center; line-height: 1.6; }
.tree-status.error { color: var(--danger); }
.error-hint { font-size: 0.7rem; color: var(--text-tertiary); margin-top: 4px; }

.file-tree { padding: 0 0 12px; display: flex; flex-direction: column; }

.tree-item {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 8px; cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
  font-size: 0.8rem; min-height: 28px; position: relative;
  border-radius: var(--radius-sm); margin: 0 6px;
}
.tree-item:hover { background: var(--bg-hover); }
.tree-item.active { background: var(--accent-light); color: var(--accent); }
.tree-item.create-item { background: var(--bg-input); margin: 4px 8px; border-radius: var(--radius-sm); padding: 2px 8px; }

.tree-arrow { flex-shrink: 0; width: 14px; font-size: 0.7rem; color: var(--text-placeholder); text-align: center; }
.tree-folder-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; color: var(--text-primary); }
.tree-file-icon { flex-shrink: 0; width: 14px; font-size: 0.7rem; color: var(--text-placeholder); text-align: center; }

.tree-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary); line-height: 1.4; }
.tree-item.active .tree-name { color: var(--accent); font-weight: 600; }

.tree-name-input {
  flex: 1; padding: 1px 6px; border: 1px solid var(--accent); border-radius: 3px;
  font-size: 0.78rem; font-family: var(--font-body); outline: none;
  background: var(--bg-card); color: var(--text-primary); min-width: 0;
}

.tree-remove {
  flex-shrink: 0; width: 20px; height: 20px; border: none; border-radius: 3px;
  background: transparent; color: var(--text-placeholder); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color var(--dur-fast) var(--ease-out); opacity: 0;
}
.tree-item:hover .tree-remove { opacity: 1; }
.tree-remove:hover { color: var(--danger); }

.drag-handle {
  flex-shrink: 0; color: var(--text-placeholder); font-size: 0.6rem;
  cursor: grab; user-select: none; opacity: 0;
}
.tree-item:hover .drag-handle { opacity: 1; }
.drag-handle:active { cursor: grabbing; }
.tree-item.dragging { opacity: 0.4; }
.tree-item.drag-over { border-top: 2px solid var(--accent); }

/* ---- main ---- */
.main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

.title {
  font-family: var(--font-display); font-size: 0.75rem; font-weight: 600;
  color: var(--text-tertiary); letter-spacing: 0.06em; text-transform: uppercase;
  margin-bottom: 16px; cursor: default;
}
.title-input {
  font-size: 0.75rem; font-weight: 600; color: var(--text-primary);
  letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 16px;
  padding: 4px 10px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: var(--bg-card); font-family: var(--font-body); outline: none; width: 200px;
}

/* ---- week table ---- */
.week-table {
  flex-shrink: 0; border-collapse: collapse; table-layout: fixed;
  background: var(--bg-card); border-radius: var(--radius-md);
  overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 24px;
  border: 1px solid var(--border-light);
}
.week-table th {
  padding: 12px 4px; font-size: 0.75rem; font-weight: 600;
  color: var(--text-secondary); text-align: center;
  border-bottom: 1px solid var(--border); background: var(--bg-surface);
}
.week-table td { padding: 4px 3px; }

.day-title-input {
  width: 100%; padding: 3px 4px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
  font-size: 0.72rem; font-family: var(--font-body); font-weight: 600; text-align: center;
  background: var(--bg-card); color: var(--text-primary); outline: none;
}

.cell-input {
  width: 100%; padding: 10px 6px; border: 1px solid transparent; border-radius: var(--radius-sm);
  font-size: 0.82rem; font-family: var(--font-body); outline: none;
  background: transparent; color: var(--text-primary); text-align: center;
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.cell-input:hover { background: var(--bg-hover); }
.cell-input:focus { border-color: var(--accent); background: var(--bg-card); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.08); }

/* ---- file editor ---- */
.section-detail {
  flex: 1; display: flex; flex-direction: column;
  background: var(--bg-card); border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm); border: 1px solid var(--border-light);
  overflow: hidden; min-height: 0;
}
.section-empty {
  display: flex; align-items: center; justify-content: center;
  color: var(--text-placeholder); font-size: 0.9rem;
  font-family: var(--font-display); font-style: italic;
}

.file-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light); flex-shrink: 0;
}
.file-name { font-size: 0.82rem; font-weight: 600; color: var(--text-primary); }
.saving-indicator { font-size: 0.7rem; color: var(--text-placeholder); animation: pulse 1s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.tab-bar {
  display: flex; border-bottom: 1px solid var(--border); background: var(--bg-surface); flex-shrink: 0;
}
.tab-btn {
  padding: 8px 20px; border: none; background: transparent;
  color: var(--text-tertiary); font-size: 0.82rem; font-weight: 500;
  font-family: var(--font-body); cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--accent); }

.editor-wrap { flex: 1; display: flex; min-height: 0; }
.editor {
  width: 100%; flex: 1; padding: 18px 22px; border: none;
  font-size: 0.88rem; font-family: var(--font-mono); line-height: 1.8;
  resize: none; outline: none; background: var(--bg-card); color: var(--text-primary); tab-size: 2;
}
.preview { flex: 1; padding: 22px 28px; background: var(--bg-card); overflow-y: auto; }

/* ---- markdown-body ---- */
.markdown-body { font-size: 0.92rem; line-height: 1.8; color: var(--text-primary); word-break: break-word; }
.markdown-body :deep(h1) { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; margin: 28px 0 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
.markdown-body :deep(h2) { font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; margin: 26px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }
.markdown-body :deep(h3) { font-size: 1.15rem; font-weight: 600; margin: 22px 0 10px; }
.markdown-body :deep(h4) { font-size: 1rem; font-weight: 600; margin: 18px 0 8px; }
.markdown-body :deep(h5), .markdown-body :deep(h6) { font-size: 0.92rem; font-weight: 600; margin: 14px 0 6px; color: var(--text-secondary); }
.markdown-body :deep(p) { margin: 0 0 14px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 0 0 14px; padding-left: 28px; }
.markdown-body :deep(li) { line-height: 1.8; margin-bottom: 4px; }
.markdown-body :deep(li)::marker { color: var(--text-tertiary); }
.markdown-body :deep(code) { background: var(--bg-surface); padding: 2px 7px; border-radius: 3px; font-size: 0.88em; font-family: var(--font-mono); color: var(--code-text); }
.markdown-body :deep(pre) { padding: 18px 20px; border-radius: var(--radius-md); overflow-x: auto; margin: 0 0 18px; background: var(--bg-surface); border: 1px solid var(--border); line-height: 1.6; }
.markdown-body :deep(pre code) { background: transparent; padding: 0; font-size: 0.85rem; color: inherit; border-radius: 0; }
.markdown-body :deep(pre code.hljs) { display: block; }
.markdown-body :deep(blockquote) { border-left: 2px solid var(--accent); padding: 8px 18px; margin: 0 0 16px; color: var(--text-secondary); background: var(--accent-light); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-style: italic; }
.markdown-body :deep(blockquote p:last-child) { margin-bottom: 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 0.86rem; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.markdown-body :deep(th), .markdown-body :deep(td) { padding: 10px 16px; border: 1px solid var(--border); text-align: left; }
.markdown-body :deep(th) { background: var(--bg-surface); font-weight: 600; font-size: 0.8rem; color: var(--text-secondary); letter-spacing: 0.03em; }
.markdown-body :deep(tr:nth-child(even) td) { background: var(--bg-input); }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
.markdown-body :deep(a) { color: var(--accent); text-decoration: none; }
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(strong) { font-weight: 650; }
.markdown-body :deep(em) { font-style: italic; }
.markdown-body :deep(img) { max-width: 100%; border-radius: var(--radius-sm); margin: 8px 0; }
.markdown-body :deep(input[type="checkbox"]) { margin-right: 8px; accent-color: var(--accent); transform: scale(1.1); cursor: default; pointer-events: none; }
.markdown-body :deep(li:has(input[type="checkbox"])) { list-style: none; margin-left: -20px; }
.markdown-body :deep(.mermaid-svg) { display: flex; justify-content: center; margin: 16px 0 20px; padding: 16px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border); overflow-x: auto; }
.markdown-body :deep(.mermaid-svg svg) { max-width: 100%; }
.markdown-body :deep(.mermaid-error) { padding: 16px; background: var(--danger-bg); border-radius: var(--radius-md); border: 1px solid var(--danger-border); color: var(--danger); font-size: 0.82rem; overflow-x: auto; margin: 16px 0 20px; }
.markdown-body :deep(.katex-display) { margin: 16px 0; overflow-x: auto; overflow-y: hidden; }
.markdown-body :deep(.katex) { font-size: 1.1em; }
</style>
