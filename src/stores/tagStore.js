import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadTags, saveTags } from '../utils/storage.js'

export const useTagStore = defineStore('tags', () => {
  const tags = ref(loadTags())
  const activeTagId = ref(null)

  function persist() {
    saveTags(tags.value)
  }

  function create(name, color = '#4a90d9') {
    const tag = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      color,
    }
    tags.value.push(tag)
    persist()
    return tag
  }

  function remove(id) {
    tags.value = tags.value.filter(t => t.id !== id)
    if (activeTagId.value === id) activeTagId.value = null
    persist()
  }

  function getByName(name) {
    return tags.value.find(t => t.name === name)
  }

  function findOrCreate(name) {
    const existing = getByName(name)
    return existing || create(name)
  }

  function setActive(id) {
    activeTagId.value = id
  }

  function rename(id, newName) {
    const tag = tags.value.find(t => t.id === id)
    if (!tag || !newName.trim() || tag.name === newName.trim()) return
    const oldName = tag.name
    tag.name = newName.trim()
    persist()
    return oldName
  }

  function getDescendantNames(tagName) {
    const names = [tagName]
    const prefix = tagName + '·'
    tags.value.forEach(t => {
      if (t.name.startsWith(prefix)) names.push(t.name)
    })
    return names
  }

  return { tags, activeTagId, create, remove, getByName, findOrCreate, setActive, getDescendantNames, rename }
})
