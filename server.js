import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.join(__dirname, 'docs')

// ensure /docs exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true })
}

const app = express()
app.use(cors())
app.use(express.json())

// ---- security: resolve path under DOCS_DIR ----
function safePath(relativePath) {
  const resolved = path.join(DOCS_DIR, path.normalize(relativePath || ''))
  if (!resolved.startsWith(DOCS_DIR + path.sep) && resolved !== DOCS_DIR) {
    return null
  }
  return resolved
}

function extname(filePath) {
  return path.extname(filePath).toLowerCase()
}

// ---- helpers: build tree ----
function readTree(dirPath, relativePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const children = []
  for (const e of entries) {
    const childRel = relativePath ? `${relativePath}/${e.name}` : e.name
    if (e.isDirectory()) {
      children.push({
        name: e.name,
        type: 'folder',
        path: childRel,
        children: readTree(path.join(dirPath, e.name), childRel)
      })
    } else if (e.isFile() && extname(e.name) === '.md') {
      children.push({
        name: e.name,
        type: 'file',
        path: childRel
      })
    }
  }
  // sort: folders first, then alphabetical
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
  return children
}

// ---- API routes ----

// GET /api/docs/tree — recursive directory listing
app.get('/api/docs/tree', (_req, res) => {
  try {
    const tree = {
      name: 'docs',
      type: 'folder',
      path: '',
      children: readTree(DOCS_DIR, '')
    }
    res.json(tree)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/docs/file?path=... — read file content
app.get('/api/docs/file', (req, res) => {
  try {
    const filePath = safePath(req.query.path)
    if (!filePath || extname(filePath) !== '.md') {
      return res.status(400).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    res.json({ path: req.query.path, content })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/docs/file — update file content
app.put('/api/docs/file', (req, res) => {
  try {
    const { path: relPath, content } = req.body
    const filePath = safePath(relPath)
    if (!filePath || extname(filePath) !== '.md') {
      return res.status(400).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/docs/file — create new file
app.post('/api/docs/file', (req, res) => {
  try {
    const { path: relPath, content } = req.body
    const name = relPath || 'untitled.md'
    const filePath = safePath(name)
    if (!filePath || extname(filePath) !== '.md') {
      return res.status(400).json({ error: 'Invalid file path' })
    }
    // ensure parent directory exists
    const parent = path.dirname(filePath)
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true })
    }
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'File already exists' })
    }
    fs.writeFileSync(filePath, content || '', 'utf-8')
    res.json({ path: name, ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/docs/file?path=... — delete file
app.delete('/api/docs/file', (req, res) => {
  try {
    const filePath = safePath(req.query.path)
    if (!filePath || extname(filePath) !== '.md') {
      return res.status(400).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    fs.unlinkSync(filePath)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/docs/folder — create folder
app.post('/api/docs/folder', (req, res) => {
  try {
    const { path: relPath } = req.body
    const folderPath = safePath(relPath)
    if (!folderPath) {
      return res.status(400).json({ error: 'Invalid folder path' })
    }
    if (fs.existsSync(folderPath)) {
      return res.status(409).json({ error: 'Folder already exists' })
    }
    fs.mkdirSync(folderPath, { recursive: true })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/docs/rename — rename/move file or folder
app.put('/api/docs/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body
    const oldFull = safePath(oldPath)
    const newFull = safePath(newPath)
    if (!oldFull || !newFull) {
      return res.status(400).json({ error: 'Invalid path' })
    }
    if (oldFull === DOCS_DIR) {
      return res.status(400).json({ error: 'Cannot rename root docs folder' })
    }
    if (!fs.existsSync(oldFull)) {
      return res.status(404).json({ error: 'Source not found' })
    }
    if (fs.existsSync(newFull)) {
      return res.status(409).json({ error: 'Target already exists' })
    }
    // ensure target directory exists
    const newParent = path.dirname(newFull)
    if (!fs.existsSync(newParent)) {
      fs.mkdirSync(newParent, { recursive: true })
    }
    fs.renameSync(oldFull, newFull)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---- backup ----
const BACKUP_DIR = path.join(__dirname, '备份')

app.post('/api/backup', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
    const { trainings, tags, notes, plan, dailyPlans } = req.body
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const file = path.join(BACKUP_DIR, `自动备份_${ts}.json`)
    fs.writeFileSync(file, JSON.stringify({ trainings, tags, notes, plan, dailyPlans, backupAt: new Date().toISOString() }, null, 2), 'utf-8')

    // keep only latest 10 backups
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort()
    while (files.length > 10) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()))
    }

    res.json({ ok: true, file })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Docs API server running at http://localhost:${PORT}`)
})
