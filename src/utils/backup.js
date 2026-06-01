let timer = null

export function scheduleBackup() {
  clearTimeout(timer)
  timer = setTimeout(() => doBackup(), 2000)
}

async function doBackup() {
  try {
    const data = {
      trainings: JSON.parse(localStorage.getItem('training-log-trainings') || '[]'),
      tags: JSON.parse(localStorage.getItem('training-log-tags') || '[]'),
      notes: localStorage.getItem('training-log-notes') || '',
      plan: JSON.parse(localStorage.getItem('training-log-plan') || '{}'),
      dailyPlans: JSON.parse(localStorage.getItem('training-log-daily-plans') || '{}'),
    }
    await fetch('http://localhost:3001/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch {
    // silent fail — backup is non-critical
  }
}