const KEYS = {
  TRAININGS: 'training-log-trainings',
  TAGS: 'training-log-tags',
  NOTES: 'training-log-notes',
}

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function loadTrainings() {
  return read(KEYS.TRAININGS) || []
}

export function saveTrainings(trainings) {
  write(KEYS.TRAININGS, trainings)
}

export function loadTags() {
  return read(KEYS.TAGS) || []
}

export function saveTags(tags) {
  write(KEYS.TAGS, tags)
}

export function loadNotes() {
  const raw = read(KEYS.NOTES)
  if (!raw) return ''
  if (Array.isArray(raw)) {
    // migrate old format: array of {id, text} → markdown string
    return raw.map(n => n.text).filter(Boolean).join('\n\n')
  }
  return typeof raw === 'string' ? raw : ''
}

export function saveNotes(md) {
  write(KEYS.NOTES, md)
}

export function exportAll() {
  return {
    trainings: loadTrainings(),
    tags: loadTags(),
    notes: loadNotes(),
    dailyPlans: loadDailyPlans(),
  }
}

const DAILY_PLANS_KEY = 'training-log-daily-plans'

export function loadDailyPlans() {
  return read(DAILY_PLANS_KEY) || {}
}

export function saveDailyPlans(plans) {
  write(DAILY_PLANS_KEY, plans)
}

const PLAN_KEY = 'training-log-plan'

function defaultPlan() {
  return { cells: ['', '', '', '', '', '', ''], notes: [], sections: [] }
}

export function loadPlan() {
  const raw = read(PLAN_KEY)
  if (!raw) return defaultPlan()
  // migrate: add sections if missing
  if (!raw.sections) raw.sections = []
  return raw
}

export function savePlan(plan) {
  write(PLAN_KEY, plan)
}

export function clearSections() {
  const current = loadPlan()
  current.sections = []
  write(PLAN_KEY, current)
}

export function importAll(data) {
  if (data.trainings) saveTrainings(data.trainings)
  if (data.tags) saveTags(data.tags)
  if (data.notes) saveNotes(data.notes)
  if (data.plan) savePlan(data.plan)
  if (data.dailyPlans) saveDailyPlans(data.dailyPlans)
}
