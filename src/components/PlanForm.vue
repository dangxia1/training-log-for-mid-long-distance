<script setup>
import { ref } from 'vue'
import { useTagStore } from '../stores/tagStore.js'

const emit = defineEmits(['close', 'save'])
const props = defineProps({ date: { type: String, required: true }, plan: { type: Object, default: null } })
const tagStore = useTagStore()

const content = ref(props.plan?.content || '')
const planDate = ref(props.date)
const selectedTagIds = ref(props.plan?.tags ? props.plan.tags.map(n => tagStore.tags.find(t => t.name === n)?.id).filter(Boolean) : [])

function toggleTag(id) { const i = selectedTagIds.value.indexOf(id); i === -1 ? selectedTagIds.value.push(id) : selectedTagIds.value.splice(i, 1) }

const newTagName = ref('')
function addNewTag() { const name = newTagName.value.trim(); if (!name) return; selectedTagIds.value.push(tagStore.findOrCreate(name).id); newTagName.value = '' }

function submit() {
  if (!content.value.trim()) return
  emit('save', { date: planDate.value, content: content.value.trim(), tags: selectedTagIds.value.map(id => tagStore.tags.find(t => t.id === id)?.name).filter(Boolean) })
}
function remove() { emit('save', { date: planDate.value, content: '', tags: [] }) }
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <h2 class="modal-title">{{ props.plan ? '编辑计划' : '新增计划' }}</h2>

      <label class="field"><span class="label">内容</span><textarea v-model="content" rows="3" placeholder="计划练什么..."></textarea></label>
      <label class="field"><span class="label">日期</span><input type="date" v-model="planDate" /></label>

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

      <div class="btns">
        <button v-if="props.plan" class="btn-danger" @click="remove">删除</button>
        <div class="spacer"></div>
        <button class="cancel" @click="emit('close')">取消</button>
        <button class="btn-primary" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal { width: 500px; }
.modal-title { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 32px; letter-spacing: 0.02em; }

.field { display: block; margin-bottom: 22px; }
.label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase; }

.field textarea, .field input[type="text"], .field input[type="date"] {
  width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 0.9rem; font-family: var(--font-body); outline: none; background: var(--bg-input); resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.field textarea:focus, .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.10); }

.tag-pool { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.chip {
  padding: 5px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg-card); font-size: 0.8rem; font-family: var(--font-body); font-weight: 500;
  cursor: pointer; color: var(--text-secondary); transition: all var(--dur-fast) var(--ease-out);
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
  font-family: var(--font-body); cursor: pointer; white-space: nowrap; transition: all var(--dur-fast) var(--ease-out);
}
.new-tag button:hover { background: var(--accent); color: #fff; }

.btns { display: flex; justify-content: flex-end; gap: 10px; margin-top: 32px; align-items: center; }
.spacer { flex: 1; }
.btn-danger { padding: 11px 20px; border: 1px solid var(--danger-border); border-radius: var(--radius-sm); background: transparent; font-size: 0.85rem; font-weight: 500; font-family: var(--font-body); cursor: pointer; color: var(--danger); transition: all var(--dur-fast) var(--ease-out); }
.btn-danger:hover { background: var(--danger-bg); }
.cancel { padding: 11px 24px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-card); font-size: 0.88rem; font-weight: 500; font-family: var(--font-body); cursor: pointer; color: var(--text-secondary); transition: all var(--dur-fast) var(--ease-out); }
.cancel:hover { background: var(--bg-hover); }
</style>
