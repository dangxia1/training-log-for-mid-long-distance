import { ref, watch } from 'vue'

export function useAutoSave(key, loadFn, saveFn, delay = 400) {
  const data = ref(loadFn())

  let timer = null
  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(() => saveFn(data.value), delay)
  }

  return { data, schedule }
}
