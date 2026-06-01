<script setup>
import { ref } from 'vue'
import { exportAll, importAll, saveTrainings } from '../utils/storage.js'

const emit = defineEmits(['close'])
const msg = ref('')

function doExport() {
  const data = exportAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `训练数据备份_${new Date().toISOString().slice(0, 10)}.json`; a.click()
  URL.revokeObjectURL(url); msg.value = '导出完成'
}
function doImport() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result); importAll(data)
        msg.value = `导入完成：${data.trainings?.length || 0} 条训练，${data.tags?.length || 0} 个标签`
        setTimeout(() => emit('close'), 1500)
      } catch { msg.value = '导入失败：文件格式不正确' }
    }; reader.readAsText(file)
  }; input.click()
}
function clearAll() {
  if (confirm('确定清空所有数据？此操作不可恢复。')) { saveTrainings([]); location.reload() }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h2 class="modal-title">数据管理</h2>

      <div class="cards">
        <button class="io-card" @click="doExport">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>导出备份</span>
        </button>
        <button class="io-card" @click="doImport">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>导入数据</span>
        </button>
        <button class="io-card danger" @click="clearAll">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>清空数据</span>
        </button>
      </div>

      <p v-if="msg" class="msg">{{ msg }}</p>

      <div class="btns">
        <button class="btn-primary" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal { width: 400px; }
.modal-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 28px; letter-spacing: 0.02em; }

.cards { display: flex; flex-direction: column; gap: 8px; }
.io-card {
  display: flex; align-items: center; gap: 16px; width: 100%; padding: 16px 20px;
  border: 1px solid var(--border-light); border-radius: var(--radius-sm);
  background: var(--bg-card); cursor: pointer; font-size: 0.9rem;
  font-weight: 500; font-family: var(--font-body); color: var(--text-primary);
  transition: all var(--dur-fast) var(--ease-out);
}
.io-card:hover { border-color: var(--border); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
.io-card:active { transform: translateY(0); }
.io-card.danger { color: var(--danger); border-color: var(--danger-border); }
.io-card.danger:hover { background: var(--danger-bg); border-color: var(--danger); }

.msg {
  margin-top: 16px; padding: 14px 18px; background: var(--success-bg);
  border-radius: var(--radius-sm); font-size: 0.84rem; color: var(--success-text);
  font-weight: 500;
}
.btns { display: flex; justify-content: flex-end; margin-top: 28px; }
</style>
