<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '../stores/trainingStore.js'
import { useTagStore } from '../stores/tagStore.js'
import { loadPlan, savePlan } from '../utils/storage.js'

const emit = defineEmits(['close'])
const props = defineProps({ editId: { type: String, default: null }, defaultDate: { type: String, default: null } })

const trainingStore = useTrainingStore()
const tagStore = useTagStore()

const existing = computed(() => props.editId ? trainingStore.trainings.find(t => t.id === props.editId) : null)
const content = ref(existing.value?.content || '')
const feeling = ref(existing.value?.feeling || '')
const date = ref(props.defaultDate || existing.value?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10))
const star = ref(existing.value?.star || false)
const importToSectionId = ref('')
const planSections = computed(() => loadPlan().sections || [])
const selectedTagIds = ref(props.editId ? (existing.value?.tags || []).map(n => tagStore.tags.find(t => t.name === n)?.id).filter(Boolean) : [])

function toggleTag(id) { const i = selectedTagIds.value.indexOf(id); i === -1 ? selectedTagIds.value.push(id) : selectedTagIds.value.splice(i, 1) }

const newTagName = ref('')
function addNewTag() { const name = newTagName.value.trim(); if (!name) return; selectedTagIds.value.push(tagStore.findOrCreate(name).id); newTagName.value = '' }

function submit() {
  if (!content.value.trim()) return
  const data = {
    content: content.value.trim(), feeling: feeling.value.trim(),
    date: new Date(date.value).toISOString(),
    tags: selectedTagIds.value.map(id => tagStore.tags.find(t => t.id === id)?.name).filter(Boolean),
    star: star.value,
  }
  props.editId ? trainingStore.update(props.editId, data) : trainingStore.create(data)

  if (importToSectionId.value) {
    const plan = loadPlan(); const section = plan.sections.find(s => s.id === importToSectionId.value)
    if (section) {
      const md = `\n\n### ${date.value}\n${content.value.trim()}` + (feeling.value.trim() ? `\n\n> ${feeling.value.trim()}` : '')
      section.content = (section.content || '') + md; savePlan(plan)
    }
  }
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h2 class="modal-title">{{ props.editId ? '编辑记录' : '新训练' }}</h2>

      <label class="field">
        <span class="label">内容</span>
        <textarea v-model="content" rows="3" placeholder="今天练了什么..."></textarea>
      </label>

      <label class="field">
        <span class="label">感受</span>
        <textarea v-model="feeling" rows="3" placeholder="训练感受..."></textarea>
      </label>

      <label class="field">
        <span class="label">日期</span>
        <input type="date" v-model="date" />
      </label>

      <div class="field">
        <span class="label">标签</span>
        <div class="tag-pool">
          <button v-for="tag in tagStore.tags" :key="tag.id" class="chip" :class="{ on: selectedTagIds.includes(tag.id) }" @click="toggleTag(tag.id)">{{ tag.name }}</button>
        </div>
        <div class="new-tag">
          <input v-model="newTagName" placeholder="新建标签" @keydown.enter.prevent="addNewTag" />
          <button type="button" @click="addNewTag">添加</button>
        </div>
      </div>

      <label class="field star-field">
        <input type="checkbox" v-model="star" />
        <svg width="15" height="15" viewBox="0 0 24 24" :fill="star ? 'var(--star)' : 'none'" :stroke="star ? 'none' : 'var(--text-tertiary)'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <span>标记为高质量训练</span>
      </label>

      <div v-if="planSections.length" class="field">
        <span class="label">导入到文档</span>
        <select v-model="importToSectionId" class="select">
          <option value="">不导入</option>
          <option v-for="s in planSections" :key="s.id" :value="s.id">{{ s.title || '未命名' }}</option>
        </select>
      </div>

      <div class="btns">
        <button v-if="props.editId" class="btn-danger" @click="trainingStore.remove(props.editId); emit('close')">删除</button>
        <div class="spacer"></div>
        <button class="cancel" @click="emit('close')">取消</button>
        <button class="btn-primary" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal { width: 520px; }
.modal-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 32px; letter-spacing: 0.02em; }

.field { display: block; margin-bottom: 22px; }
.label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase; }

.field textarea, .field input[type="text"], .field input[type="date"] {
  width: 100%; padding: 12px 16px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 0.9rem; font-family: var(--font-body); outline: none;
  background: var(--bg-input); resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.field textarea:focus, .field input:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.10);
}

.tag-pool { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.chip {
  padding: 5px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-card); font-size: 0.8rem; font-family: var(--font-body); font-weight: 500;
  cursor: pointer; color: var(--text-secondary);
  transition: all var(--dur-fast) var(--ease-out);
}
.chip:hover { border-color: var(--accent); color: var(--accent); }
.chip.on { background: var(--accent); color: #fff; border-color: var(--accent); }
.chip:active { transform: scale(0.96); }

.new-tag { display: flex; gap: 8px; }
.new-tag input { flex: 1; padding: 8px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.84rem; font-family: var(--font-body); outline: none; background: var(--bg-input); }
.new-tag input:focus { border-color: var(--accent); }
.new-tag button {
  padding: 8px 18px; border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: transparent; color: var(--accent); font-size: 0.84rem; font-weight: 600;
  font-family: var(--font-body); cursor: pointer; white-space: nowrap;
  transition: all var(--dur-fast) var(--ease-out);
}
.new-tag button:hover { background: var(--accent); color: #fff; }

.star-field { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--text-secondary); cursor: pointer; }
.star-field input[type="checkbox"] { accent-color: var(--star); width: 16px; height: 16px; }

.select {
  width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 0.9rem; font-family: var(--font-body); outline: none; background: var(--bg-input); cursor: pointer; appearance: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.select:focus { border-color: var(--accent); }

.btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 32px; align-items: center; }
.spacer { flex: 1; }
.btn-danger {
  padding: 11px 20px; border: 1px solid var(--danger-border); border-radius: var(--radius-sm);
  background: transparent; font-size: 0.85rem; font-weight: 500; font-family: var(--font-body);
  cursor: pointer; color: var(--danger); transition: all var(--dur-fast) var(--ease-out);
}
.btn-danger:hover { background: var(--danger-bg); }

.cancel {
  padding: 11px 24px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-card); font-size: 0.88rem; font-weight: 500; font-family: var(--font-body);
  cursor: pointer; color: var(--text-secondary); transition: all var(--dur-fast) var(--ease-out);
}
.cancel:hover { background: var(--bg-hover); }
</style>
