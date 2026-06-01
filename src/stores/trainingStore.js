import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadTrainings, saveTrainings } from '../utils/storage.js'

export const useTrainingStore = defineStore('trainings', () => {
  const raw = loadTrainings()
  let fixed = false
  raw.forEach(t => {
    if (!t.id) { t.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); fixed = true }
  })
  const trainings = ref(raw)
  if (fixed) saveTrainings(trainings.value)

  function persist() {
    saveTrainings(trainings.value)
  }

  function create(data) {
    const record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content: data.content,
      feeling: data.feeling || '',
      date: data.date || new Date().toISOString(),
      tags: data.tags || [],
      star: data.star || false,
    }
    trainings.value.unshift(record)
    persist()
    return record
  }

  function update(id, data) {
    const idx = trainings.value.findIndex(t => t.id === id)
    if (idx === -1) return
    Object.assign(trainings.value[idx], data)
    persist()
  }

  function remove(id) {
    trainings.value = trainings.value.filter(t => t.id !== id)
    persist()
  }

  function getByTag(tagName) {
    return trainings.value.filter(t => t.tags.includes(tagName))
  }

  return { trainings, create, update, remove, getByTag }
})
