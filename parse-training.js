import { readFileSync, writeFileSync } from 'fs'

const md = readFileSync('训练.md', 'utf-8')
const lines = md.split('\n')

// ---- feeling keywords ----
const FEELING_KW = [
  '睡不着', '感觉', '有点累', '有些累', '很酸', '很累', '很热', '中暑',
  '不适', '大喘气', '缺氧', '不安', '僵硬', '酸痛', '晕', '苦',
  '不想输', '状态很差', '难受', '膝盖', '发麻', '想', '觉得',
  '不行', '太累', '体感', '心率偏', '微微', '实在', '注意',
  '切记', '下回', '考虑', '鉴定为', '视为', '得', '不要',
  '要', '应该', '可以', '不能', '别', '最好', '需要',
  '爽', '强度挺大', '有些', '但还是',
]

function isFeelingLine(text) {
  const t = text.trim()
  if (!t) return false
  // Lines that are clearly training descriptions (contain distances, reps, sets, times)
  if (/^\d+[mMk]|^\d+x|^\d+s|^\d+min|^\d+组|^\d+[k千]|^\d+[公]|^\d+[圈]|^\d+[个下秒]|配速|间歇|热身|跑步|训练|配速|负重|半蹲|深蹲|硬拉|箭步|单腿|保加利亚|俄罗斯|平板|侧桥|背桥|登山|卷腹|俯卧撑|弹力|死虫|游泳|超人/.test(t)) return false
  if (/^\d+[.]\d+[公k]/.test(t)) return false
  if (FEELING_KW.some(kw => t.includes(kw))) return true
  return false
}

// ---- tag extraction from title ----
const TAG_RULES = [
  [/强度课|专项课|比赛|赛前/, '强度课'],
  [/间歇|大间歇/, '强度课'],
  [/恢复跑/, '恢复跑'],
  [/纯歇/, '休息'],
  [/lsd|长距离|有氧跑/i, '有氧跑'],
  [/体育课/, '体育课'],
  [/力量训练|力量课|臀腿/, '力量训练'],
  [/核心/, '核心训练'],
]

// Detect 强度课 from content patterns (sprint distances, intervals, time trials)
function hasQualityIndicator(content, title) {
  const text = content + ' ' + title
  // Sprint/time patterns: 1000m311, 600m2min8s, 400m64s, 200m手臂
  if (/\d{3,4}\s*m/.test(text)) return true
  // Time trial: 1min40s, 2min8s, 72s
  if (/\d{1,2}\s*min\s*\d{1,2}\s*s/.test(text)) return true
  // Interval patterns: 6x300m, 3x100, 200*8, 400*6, 150*5*4
  if (/\d+\s*[x*×]\s*\d+/.test(text)) return true
  // Split times: 63+37
  if (/\d{2,3}\s*[+＋]\s*\d{2,3}/.test(text)) return true
  // Title like "1000 + 600", "200+300+300"
  if (/\d{3,4}\s*[+＋]/.test(title)) return true
  return false
}

function extractTags(title) {
  const tags = []
  for (const [re, tag] of TAG_RULES) {
    if (re.test(title) && !tags.includes(tag)) {
      tags.push(tag)
    }
  }
  // fallback: day of week → default tag
  if (!tags.length) {
    if (/周[一二三]|周一|周二|周三/.test(title)) tags.push('恢复跑')
    else if (/周[四五六]|周四|周五|周六/.test(title)) tags.push('恢复跑')
    else tags.push('其他')
  }
  return tags
}

// ---- parse ----
const notes = []
const trainings = []
const tagSet = new Set()

let section = null
let month = 4 // default
let year = 2026

// Parse experience notes from ## 经验总结
let inNotes = false
for (const line of lines) {
  if (/^## 经验总结/.test(line)) { inNotes = true; continue }
  if (inNotes && /^## /.test(line)) { inNotes = false; continue }
  if (inNotes) {
    const m = line.match(/^\d+[.]\s+(.+)/)
    if (m) notes.push(m[1].trim())
    continue
  }
}

// Parse year/month from heading
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Track section
  if (/^## 训练日志/.test(line)) { section = 'logs'; continue }
  if (/^## /.test(line) && line !== '## 训练日志') { section = null; continue }
  if (section !== 'logs') continue

  // Month heading: ### 2026.4
  let mm = line.match(/^### (\d{4})[.](\d{1,2})/)
  if (mm) {
    year = parseInt(mm[1])
    month = parseInt(mm[2])
    continue
  }

  // Skip week headings: #### 4.12-4.18
  if (/^#### /.test(line)) continue

  // Training entry: **4.12周日强度课**
  let m = line.match(/^\*\*(\d{1,2})[.](\d{1,2})([^*]+)\*\*/)
  if (!m) continue

  const entryMonth = parseInt(m[1])
  const entryDay = parseInt(m[2])
  const title = m[3].trim()

  const dateStr = `${year}-${String(entryMonth).padStart(2, '0')}-${String(entryDay).padStart(2, '0')}`

  // Collect content lines until next entry or separator
  const contentLines = []
  const feelingLines = []
  i++
  while (i < lines.length) {
    const l = lines[i]
    // Stop at next entry, heading, or horizontal rule
    if (/^\*\*/.test(l) || /^###/.test(l) || /^####/.test(l) || /^---/.test(l) || /^## /.test(l)) {
      i--
      break
    }
    const trimmed = l.trim()
    if (trimmed.startsWith('- ')) {
      const text = trimmed.slice(2).trim()
      if (text) {
        if (isFeelingLine(text)) {
          feelingLines.push(text)
        } else {
          contentLines.push(text)
        }
      }
    }
    i++
  }

  const tags = extractTags(title)
  tags.forEach(t => tagSet.add(t))

  // Content-based tag augmentation
  const allText = contentLines.join(' ') + ' ' + title
  if (/核心/.test(allText) && !tags.includes('核心训练')) tags.push('核心训练')
  if (/力量/.test(allText) && !tags.includes('力量训练')) tags.push('力量训练')
  // Quality work detection: if title has no tag match but content shows intensity, tag as 强度课
  const isQI = hasQualityIndicator(allText, title)
  if (isQI && !tags.includes('强度课') && !tags.includes('力量训练')) {
    // Remove day-of-week fallback if quality indicators present
    if (tags.length === 1 && /[一二三四五六日]/.test(title)) tags.length = 0
    tags.push('强度课')
  }

  // Remove duplicate tag "恢复跑" and "恢复" - prefer 恢复跑
  if (tags.includes('恢复跑') && tags.includes('恢复')) {
    const idx = tags.indexOf('恢复')
    if (idx !== -1) tags.splice(idx, 1)
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + String(trainings.length)
  trainings.push({
    id,
    content: contentLines.join('\n') || title,
    date: dateStr,
    feeling: feelingLines.join('\n'),
    tags: [...new Set(tags)],
    star: false,
  })
}

// Build tags array for import
const tagColors = {
  '强度课': '#ef4444',
  '恢复跑': '#22c55e',
  '有氧跑': '#3b82f6',
  '体育课': '#f59e0b',
  '力量训练': '#8b5cf6',
  '核心训练': '#ec4899',
  '休息': '#9ca3af',
}

const tags = [...tagSet].map(name => ({
  id: name,
  name,
  color: tagColors[name] || '#4a90d9',
}))

// Notes with IDs
const notesOut = notes.map((text, i) => ({
  id: `note-${i + 1}`,
  text,
}))

const output = { trainings, tags, notes: notesOut }

writeFileSync('训练数据导入.json', JSON.stringify(output, null, 2), 'utf-8')
console.log(`Done: ${trainings.length} trainings, ${tags.length} tags, ${notesOut.length} notes`)