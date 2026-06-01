import { ref } from 'vue'

const THEMES = [
  { id: 'original', label: '原版' },
  { id: 'paper',    label: '暖纸' },
  { id: 'matcha',   label: '抹茶' },
  { id: 'mist',     label: '雾蓝' },
  { id: 'dark',     label: '深色' },
]

const STORAGE_KEY = 'training-log-theme'

const current = ref(localStorage.getItem(STORAGE_KEY) || 'original')
document.documentElement.setAttribute('data-theme', current.value)

export function useTheme() {
  function setTheme(id) {
    if (!THEMES.find(t => t.id === id)) return
    current.value = id
    const attr = id === 'original' ? '' : id
    if (attr) {
      document.documentElement.setAttribute('data-theme', attr)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { theme: current, themes: THEMES, setTheme }
}
