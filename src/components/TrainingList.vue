<script setup>
import { formatDate } from '../utils/format.js'
defineProps({ records: { type: Array, default: () => [] } })
defineEmits(['edit', 'delete', 'toggleStar'])
</script>

<template>
  <div class="list">
    <article v-for="r in records" :key="r.id" class="card" :class="{ starred: r.star }">
      <div class="card-meta">
        <time class="card-date">{{ formatDate(r.date) }}</time>
        <svg v-if="r.star" class="card-star" width="13" height="13" viewBox="0 0 24 24" :fill="'var(--star)'" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>

      <p class="card-content">{{ r.content }}</p>

      <p v-if="r.feeling" class="card-feeling">{{ r.feeling }}</p>

      <div class="card-tags" v-if="r.tags.length">
        <span v-for="t in r.tags" :key="t" class="card-tag">{{ t }}</span>
      </div>

      <div class="card-actions">
        <button class="act" @click="$emit('toggleStar', r.id)">
          <svg width="13" height="13" viewBox="0 0 24 24" :fill="r.star ? 'none' : 'var(--star)'" :stroke="r.star ? 'currentColor' : 'none'" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {{ r.star ? '取消星标' : '星标' }}
        </button>
        <button class="act" @click="$emit('edit', r.id)">编辑</button>
        <button class="act danger" @click="$emit('delete', r.id)">删除</button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.list { display: flex; flex-direction: column; gap: 16px; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 28px 32px;
  transition: box-shadow var(--dur-normal) var(--ease-editorial), border-color var(--dur-normal) var(--ease-editorial);
  box-shadow: var(--shadow-sm);
}
.card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-md);
}
.card.starred {
  border-left: 3px solid var(--star);
}

.card-meta {
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.card-date {
  font-family: var(--font-display);
  font-size: 0.85rem; font-style: italic;
  color: var(--text-tertiary); letter-spacing: 0.02em;
}
.card-star { flex-shrink: 0; }

.card-content {
  font-size: 1.05rem; line-height: 1.7; color: var(--text-primary);
  white-space: pre-wrap; margin-bottom: 0;
  font-family: var(--font-body);
}

.card-feeling {
  margin-top: 16px; padding: 16px 20px;
  background: var(--bg-surface); border-radius: var(--radius-sm);
  font-size: 0.9rem; line-height: 1.7; color: var(--text-secondary);
  white-space: pre-wrap; font-style: italic;
  border-left: 2px solid var(--accent);
  font-family: var(--font-display);
}

.card-tags {
  display: flex; gap: 6px; flex-wrap: wrap; margin-top: 16px;
}
.card-tag {
  font-size: 0.76rem; padding: 5px 14px;
  border-radius: 20px;
  background: var(--accent-light); color: var(--accent);
  font-weight: 600; letter-spacing: 0.03em;
  font-family: var(--font-body);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.card-actions {
  display: flex; gap: 20px; margin-top: 18px; padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.act {
  padding: 4px 0; border: none; background: none;
  font-size: 0.8rem; font-weight: 500; font-family: var(--font-body);
  color: var(--text-tertiary); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px;
  transition: color var(--dur-fast) var(--ease-out);
  letter-spacing: 0.01em;
}
.act:hover { color: var(--accent); }
.act:active { transform: scale(0.97); }
.act.danger:hover { color: var(--danger); }
</style>
