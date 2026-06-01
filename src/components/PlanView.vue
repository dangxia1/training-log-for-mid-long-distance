<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '../stores/trainingStore.js'
import { loadDailyPlans, saveDailyPlans } from '../utils/storage.js'
import { formatDate } from '../utils/format.js'
import PlanForm from './PlanForm.vue'
import TrainingForm from './TrainingForm.vue'

const trainingStore = useTrainingStore()

const STORAGE_KEY = 'training-log-plan-view-mode'
const viewMode = ref(localStorage.getItem(STORAGE_KEY) || 'week')
function setViewMode(m) { viewMode.value = m; localStorage.setItem(STORAGE_KEY, m) }

// ---- week mode ----
const weekOffset = ref(0)
const weekStart = computed(() => {
  const now = new Date()
  const day = now.getDay()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - day + weekOffset.value * 7)
  sunday.setHours(0, 0, 0, 0)
  return sunday
})
function todayStr() { return formatDate(new Date()) }

const weekDays = computed(() => {
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value); d.setDate(d.getDate() + i)
    const ds = formatDate(d)
    const records = trainingStore.trainings.filter(t => t.date?.slice(0, 10) === ds).sort((a, b) => new Date(b.date) - new Date(a.date))
    const plan = plans.value[ds]
    out.push({ date: d, dateStr: ds, isToday: ds === todayStr(), records, plan: plan?.content ? plan : null })
  }
  return out
})
function prevWeek() { weekOffset.value-- }
function nextWeek() { weekOffset.value++ }
function goThisWeek() { weekOffset.value = 0 }

// ---- plan mode ----
const plans = ref(loadDailyPlans())
const editingPlanDate = ref(null)
const editingTrainingId = ref(null)
const newTrainingDate = ref(null)

function persist() { saveDailyPlans(plans.value) }

function findAnchor() {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const ds = formatDate(d)
    if (!plans.value[ds]?.content && !trainingStore.trainings.some(t => t.date?.slice(0, 10) === ds)) return d
  }
  const fb = new Date(today); fb.setDate(fb.getDate() + 60); return fb
}
const anchor = ref(findAnchor())
function shiftAnchor(d) { const a = new Date(anchor.value); a.setDate(a.getDate() + d); anchor.value = a }
function resetAnchor() { anchor.value = findAnchor() }

const visibleDays = computed(() => {
  const out = []; const a = new Date(anchor.value)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(a); d.setDate(d.getDate() - i)
    const ds = formatDate(d)
    const actualRecords = trainingStore.trainings.filter(t => t.date?.slice(0, 10) === ds).sort((a, b) => new Date(b.date) - new Date(a.date))
    const plan = plans.value[ds]
    out.push({ date: d, dateStr: ds, isToday: ds === todayStr(), isAnchor: i === 0, actualRecords, plan: plan?.content ? plan : null, display: actualRecords.length ? 'actual' : plan?.content ? 'plan' : 'empty' })
  }
  return out
})

const weekLabel = computed(() => {
  const fmt = d => `${d.getMonth() + 1}.${d.getDate()}`
  const days = viewMode.value === 'week' ? weekDays.value : visibleDays.value
  return `${fmt(days[0].date)} - ${fmt(days[6].date)}`
})
const weekLabelAlt = computed(() => {
  const days = viewMode.value === 'week' ? weekDays.value : visibleDays.value
  const m = days[3].date  // middle day
  return `${m.getFullYear()}年${m.getMonth() + 1}月`
})

function goLatest() { viewMode.value === 'week' ? goThisWeek() : resetAnchor() }

function handleDayClick(day) {
  if (viewMode.value === 'week') {
    if (day.records.length) { editingTrainingId.value = day.records[0].id }
    return
  }
  if (day.display === 'plan' || day.display === 'empty') { editingPlanDate.value = day.dateStr }
}

function onPlanSave(data) {
  if (data.content) { plans.value[data.date] = { content: data.content, tags: data.tags } }
  else { delete plans.value[data.date] }
  persist(); editingPlanDate.value = null; anchor.value = findAnchor()
}
function onPlanClose() { editingPlanDate.value = null }
function onTrainingClose() { editingTrainingId.value = null; newTrainingDate.value = null }

const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const dayLabelsEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
</script>

<template>
  <div class="plan-view">
    <!-- Editorial header -->
    <header class="plan-header">
      <div class="plan-header-left">
        <p class="plan-eyebrow">{{ weekLabelAlt }}</p>
        <h2 class="plan-headline" @click="goLatest">{{ weekLabel }}</h2>
      </div>
      <div class="plan-header-right">
        <div class="mode-switch">
          <button :class="{ active: viewMode === 'week' }" @click="setViewMode('week')">周历</button>
          <button :class="{ active: viewMode === 'plan' }" @click="setViewMode('plan')">计划</button>
        </div>
        <div class="nav-arrows">
          <button class="nav-arrow" @click="viewMode === 'week' ? prevWeek() : shiftAnchor(-7)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="nav-arrow today-btn" @click="goLatest">今天</button>
          <button class="nav-arrow" @click="viewMode === 'week' ? nextWeek() : shiftAnchor(7)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- ==== Week calendar ==== -->
    <div v-if="viewMode === 'week'" class="week-spread">
      <div v-for="d in weekDays" :key="'wk-' + d.dateStr" class="day-card" :class="{ today: d.isToday }" @click="handleDayClick(d)">
        <div class="day-card-head">
          <span class="day-label-en">{{ dayLabelsEn[d.date.getDay()] }}</span>
          <span class="day-label-zh">{{ dayLabels[d.date.getDay()] }}</span>
          <time class="day-num">{{ d.date.getDate() }}</time>
        </div>
        <div class="day-card-body">
          <div v-if="d.plan && !d.records.length" class="entry entry-plan" @click.stop="newTrainingDate = d.dateStr">
            <span class="star-slot"></span>
            <span class="tags-slot"><span v-for="t in d.plan.tags" :key="t" class="entry-tag">{{ t }}</span></span>
            <span class="entry-text">{{ d.plan.content }}</span>
          </div>
          <div v-for="r in d.records" :key="r.id" class="entry" @click.stop="editingTrainingId = r.id">
            <span class="star-slot">
              <svg v-if="r.star" class="star-mark" width="14" height="14" viewBox="0 0 24 24" :fill="'var(--star)'" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <span class="tags-slot"><span v-for="t in r.tags" :key="t" class="entry-tag">{{ t }}</span></span>
            <span class="entry-text">{{ r.content }}</span>
          </div>
          <div v-if="!d.plan && !d.records.length" class="entry entry-empty">&mdash;</div>
        </div>
      </div>
    </div>

    <!-- ==== Plan mode ==== -->
    <div v-else class="week-spread">
      <div v-for="d in visibleDays" :key="'plan-' + d.dateStr" class="day-card" :class="{ today: d.isToday, anchor: d.isAnchor, planned: d.display === 'plan' }" @click="handleDayClick(d)">
        <div class="day-card-head">
          <span class="day-label-en">{{ dayLabelsEn[d.date.getDay()] }}</span>
          <span class="day-label-zh">{{ dayLabels[d.date.getDay()] }}</span>
          <time class="day-num">{{ d.date.getDate() }}</time>
        </div>
        <div class="day-card-body">
          <template v-if="d.display === 'actual'">
            <div class="entry">
              <span class="star-slot">
                <svg v-if="d.actualRecords[0].star" class="star-mark" width="14" height="14" viewBox="0 0 24 24" :fill="'var(--star)'" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <span class="tags-slot"><span v-for="t in d.actualRecords[0].tags" :key="t" class="entry-tag">{{ t }}</span></span>
              <span class="entry-text">{{ d.actualRecords[0].content }}</span>
            </div>
          </template>
          <template v-else-if="d.display === 'plan'">
            <div class="entry entry-plan">
              <span class="star-slot"></span>
              <span class="tags-slot"><span v-for="t in d.plan.tags" :key="t" class="entry-tag">{{ t }}</span></span>
              <span class="entry-text">{{ d.plan.content }}</span>
            </div>
          </template>
          <template v-else>
            <div class="entry entry-empty">添加计划</div>
          </template>
        </div>
      </div>
    </div>

    <PlanForm v-if="editingPlanDate" :date="editingPlanDate" :plan="plans[editingPlanDate] || null" @save="onPlanSave" @close="onPlanClose" />
    <TrainingForm v-if="editingTrainingId" :edit-id="editingTrainingId" @close="onTrainingClose" />
    <TrainingForm v-if="newTrainingDate" :default-date="newTrainingDate" @close="onTrainingClose" />
  </div>
</template>

<style scoped>
.plan-view { display: flex; flex-direction: column; gap: 32px; }

/* ---- Editorial header ---- */
.plan-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  flex-wrap: wrap; gap: 16px;
}
.plan-eyebrow {
  font-family: var(--font-display);
  font-size: 0.8rem; font-style: italic; color: var(--text-tertiary);
  letter-spacing: 0.04em; margin-bottom: 4px;
}
.plan-headline {
  font-family: var(--font-display);
  font-size: 2.4rem; font-weight: 700; letter-spacing: -0.01em;
  color: var(--text-primary); line-height: 1.1; cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out);
}
.plan-headline:hover { color: var(--accent); }

.plan-header-right { display: flex; align-items: center; gap: 20px; }

.mode-switch {
  display: flex; gap: 2px;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 3px; background: var(--bg-surface);
}
.mode-switch button {
  padding: 6px 14px; border: none; border-radius: 3px;
  background: transparent; font-family: var(--font-body);
  font-size: 0.78rem; font-weight: 500; color: var(--text-tertiary);
  cursor: pointer; transition: all var(--dur-fast) var(--ease-out);
}
.mode-switch button:hover { color: var(--text-primary); }
.mode-switch button.active { background: var(--bg-card); color: var(--text-primary); font-weight: 600; box-shadow: var(--shadow-sm); }

.nav-arrows { display: flex; gap: 8px; align-items: center; }
.nav-arrow {
  width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 50%;
  background: var(--bg-card); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.nav-arrow:hover { border-color: var(--accent); color: var(--accent); }
.nav-arrow:active { transform: scale(0.94); }
.today-btn {
  width: auto; padding: 0 14px; border-radius: 17px;
  font-family: var(--font-body); font-size: 0.78rem; font-weight: 500;
}

/* ---- Week spread: 7 rows, content flows horizontally ---- */
.week-spread {
  display: flex; flex-direction: column; gap: 6px;
}

.day-card {
  display: flex; align-items: stretch;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.day-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-md);
}
.day-card.today {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.10);
}

.day-card-head {
  width: 80px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-right: 1px solid var(--border-light);
  background: var(--bg-surface); gap: 2px;
}
.day-card.today .day-card-head { background: var(--accent-soft); }

.day-label-en {
  font-family: var(--font-display); font-size: 0.58rem; font-weight: 600;
  letter-spacing: 0.10em; color: var(--text-tertiary);
}
.day-label-zh { font-size: 0.64rem; color: var(--text-tertiary); font-weight: 500; }
.day-num {
  font-family: var(--font-display); font-size: 1.35rem; font-weight: 700;
  color: var(--text-primary); line-height: 1;
}
.today .day-num { color: var(--accent); }

.day-card-body {
  flex: 1; padding: 10px 14px;
  display: flex; align-items: flex-start; gap: 10px;
  overflow-x: auto;
}

.entry {
  display: flex; align-items: flex-start;
  font-size: 0.85rem; line-height: 1.55; flex: 1; min-width: 0;
}

/* Fixed-width slots for column alignment across rows */
.star-slot { width: 20px; flex-shrink: 0; display: flex; justify-content: flex-start; padding-top: 2px; }
.tags-slot { width: 120px; flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-start; padding-top: 1px; }

.entry-text {
  color: var(--text-primary); font-weight: 500;
  white-space: pre-wrap; word-break: break-word;
  flex: 1; text-align: left; min-width: 0;
}

.entry-tag {
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.7rem; font-weight: 600;
  background: var(--accent-light); color: var(--accent);
  letter-spacing: 0.03em; white-space: nowrap;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}

.entry-plan .entry-text { color: var(--plan-accent); }
.entry-empty { color: var(--text-placeholder); font-style: italic; font-size: 0.78rem; padding: 2px 0; }

.star-mark { flex-shrink: 0; display: block; }

.anchor { border-color: var(--plan-accent); }
.anchor .day-card-head { background: var(--plan-bg); }
.anchor .day-num { color: var(--plan-accent); font-weight: 700; }
</style>
