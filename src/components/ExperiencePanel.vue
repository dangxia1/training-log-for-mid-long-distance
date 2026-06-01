<script setup>
import { ref, computed, nextTick } from 'vue'
import { marked } from 'marked'
import { loadNotes, saveNotes } from '../utils/storage.js'
import { useAutoSave } from '../composables/useAutoSave.js'

marked.setOptions({ breaks: true, gfm: true })

const { data: content, schedule: autoSave } = useAutoSave(null, loadNotes, saveNotes)
const mode = ref('edit')
const rendered = computed(() => marked.parse(content.value || ''))

function loadTitles() { try { return JSON.parse(localStorage.getItem('training-log-titles') || '{}') } catch { return {} } }
function saveTitles(t) { localStorage.setItem('training-log-titles', JSON.stringify(t)) }

const titles = ref(loadTitles())
function titleVal(key, fallback) { return titles.value[key] || fallback }
const editingTitle = ref(null)
const titleInputRef = ref(null)

function startEditTitle(key) { editingTitle.value = key; nextTick(() => titleInputRef.value?.focus()) }
function finishEditTitle() { editingTitle.value = null; saveTitles(titles.value) }
</script>

<template>
  <div class="panel">
    <header class="panel-header">
      <input v-if="editingTitle === 'notes'" ref="titleInputRef" v-model="titles['notes']" class="title-input" @keydown.enter="finishEditTitle()" @blur="finishEditTitle()" />
      <h2 v-else class="panel-headline" @dblclick="startEditTitle('notes')">{{ titleVal('notes', '训练笔记') }}</h2>
      <p class="panel-sub">Markdown 编辑，自动保存</p>
    </header>

    <div class="editorial-tabs">
      <button :class="{ active: mode === 'edit' }" @click="mode = 'edit'">编辑</button>
      <button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">预览</button>
    </div>

    <div v-show="mode === 'edit'" class="editor-wrap">
      <textarea v-model="content" class="editor" placeholder="用 Markdown 书写训练笔记..." @input="autoSave"></textarea>
    </div>

    <div v-show="mode === 'preview'" class="preview markdown-body" v-html="rendered"></div>
  </div>
</template>

<style scoped>
.panel { max-width: 760px; }

.panel-header { margin-bottom: 24px; }
.panel-headline {
  font-family: var(--font-display); font-size: 2rem; font-weight: 700;
  letter-spacing: 0.02em; color: var(--text-primary); cursor: default; line-height: 1.2;
}
.panel-sub {
  font-family: var(--font-display); font-size: 0.85rem; font-style: italic;
  color: var(--text-tertiary); margin-top: 6px; letter-spacing: 0.02em;
}
.title-input {
  font-family: var(--font-display); font-size: 2rem; font-weight: 700;
  letter-spacing: 0.02em; color: var(--text-primary);
  padding: 4px 12px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: var(--bg-card); outline: none; width: 300px;
}

.editorial-tabs {
  display: flex; gap: 1px;
  border-bottom: 2px solid var(--border); margin-bottom: 0;
}
.editorial-tabs button {
  padding: 10px 24px; border: none; background: transparent;
  font-family: var(--font-body); font-size: 0.85rem; font-weight: 500;
  color: var(--text-tertiary); cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
  border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.editorial-tabs button:hover { color: var(--text-primary); }
.editorial-tabs button.active {
  color: var(--accent); font-weight: 600; border-bottom-color: var(--accent);
}
.editorial-tabs button:active { transform: scale(0.97); }

.editor-wrap { margin-top: -1px; }
.editor {
  width: 100%; min-height: 480px; padding: 24px 0;
  border: none; font-size: 0.95rem; font-family: var(--font-mono);
  line-height: 1.8; resize: vertical; outline: none;
  background: transparent; color: var(--text-primary); tab-size: 2;
}

.preview {
  padding: 24px 0; min-height: 480px;
}

/* Markdown body */
.markdown-body { font-size: 0.95rem; line-height: 1.8; color: var(--text-primary); }
.markdown-body :deep(h1) { font-family: var(--font-display); font-size: 1.8rem; font-weight: 700; margin: 32px 0 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.02em; }
.markdown-body :deep(h2) { font-family: var(--font-display); font-size: 1.4rem; font-weight: 600; margin: 28px 0 12px; letter-spacing: 0.02em; }
.markdown-body :deep(h3) { font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; margin: 22px 0 10px; }
.markdown-body :deep(p) { margin: 0 0 14px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 0 0 14px; padding-left: 28px; }
.markdown-body :deep(li) { margin-bottom: 4px; }
.markdown-body :deep(code) { background: var(--bg-surface); padding: 2px 7px; border-radius: 3px; font-size: 0.88em; font-family: var(--font-mono); color: var(--code-text); }
.markdown-body :deep(pre) { background: var(--bg-surface); padding: 18px 22px; border-radius: var(--radius-md); overflow-x: auto; margin: 0 0 18px; border: 1px solid var(--border); }
.markdown-body :deep(pre code) { background: transparent; padding: 0; font-size: 0.85rem; color: var(--text-primary); }
.markdown-body :deep(blockquote) { border-left: 2px solid var(--accent); padding: 6px 18px; margin: 0 0 14px; color: var(--text-secondary); background: var(--accent-light); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-style: italic; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 0 0 18px; font-size: 0.88rem; }
.markdown-body :deep(th), .markdown-body :deep(td) { padding: 10px 16px; border: 1px solid var(--border); text-align: left; }
.markdown-body :deep(th) { background: var(--bg-surface); font-weight: 600; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
.markdown-body :deep(a) { color: var(--accent); text-decoration: none; }
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(strong) { font-weight: 650; }
.markdown-body :deep(img) { max-width: 100%; border-radius: var(--radius-sm); }
</style>
