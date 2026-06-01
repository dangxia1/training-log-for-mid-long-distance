export function pad(n) {
  return String(n).padStart(2, '0')
}

export function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
