# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## claude code 需要遵守的规则

- 用户每次发送指令时，有任何不确定的点请向用户确认
- 更新 CLAUDE.md 时同步更新 `README.md`
- 每次沉淀对话时，更新相关文档，并删去各个文件中多余的内容
- 设计系统遵循 taste-skill 杂志/编辑风规范（`design-taste-frontend` / `redesign-existing-projects`）
  - 布局：顶部刊头导航（替代左侧深色侧栏），内容区 max-width 1100px 居中，大量留白
  - 字体：Playfair Display（拉丁衬线标题）+ Noto Serif SC（中文衬线）+ Inter（正文），Google Fonts 加载
  - 色彩：暖纸底色 `#faf8f3` + 墨色正文 `#1a1714` + 酒红单点缀 `#8b3a3a`，支持深色模式切换
  - 动效：CSS 变量 `--dur-fast: 180ms` / `--dur-normal: 300ms` / `--ease-editorial`，`prefers-reduced-motion` 降级
  - 阴影：使用 `var(--shadow-sm/md/lg)` 分层阴影变量
  - 图标：内联 SVG 替代 emoji，禁止引入第三方图标库（无 npm 依赖）
  - 纹理：全局微噪点叠加层（`pointer-events: none`），`prefers-reduced-transparency` 时禁用

## 项目架构

```
src/
├── components/
│   ├── PlanView.vue          # 计划制定（杂志跨页日历 / 滚动锚点计划窗）
│   ├── TrainingPlan.vue      # 训练思路（周表格 + /docs 文件树 + Markdown 编辑/预览）
│   ├── ExperiencePanel.vue   # 训练笔记（Markdown 编辑/预览，自动保存）
│   ├── TrainingForm.vue      # 新增/编辑训练记录（模态表单）
│   ├── TrainingList.vue      # 记录列表（编辑风卡片：衬线日期 + 引文体感受）
│   ├── TrainingTypeView.vue  # 训练类型（标签目录 + 记录浏览 + Star 筛选）
│   ├── PlanForm.vue          # 计划编辑表单
│   ├── StarFilter.vue        # Star 筛选开关（SVG 星标图标）
│   └── DataIO.vue            # 数据导入/导出/清空
├── stores/
│   ├── trainingStore.js      # 训练记录增删改查，自动补齐缺失 id
│   └── tagStore.js           # 标签库 + 层级查询 + 重命名同步
├── utils/
│   ├── storage.js            # localStorage 读写
│   └── format.js             # 日期格式化
├── composables/
│   └── useAutoSave.js        # 自动保存防抖
├── styles/
│   ├── shared.css            # 模态框、按钮等共用样式
│   └── themes.css            # 编辑风配色 CSS 变量 + 深色主题覆写
├── App.vue                   # 主布局（顶部刊头导航 + 内容网格 + FAB + 深色切换）
└── main.js                   # 入口（挂载 Pinia + App）
server.js                      # Express 后端（端口 3001），提供 /api/docs/* 文件操作 API
docs/                          # Markdown 文档目录
运行训练日志.bat               # 一键启动
parse-training.js              # 训练.md → 训练数据导入.json
```

## 数据结构

- **训练记录**: `{ id, content, date (YYYY-MM-DD), feeling, tags: string[], star: boolean }`
- **标签**: `{ id, name, color }`，名称支持层级（`·` 分隔），如 `力量训练·下肢`
- **经验总结**: markdown 字符串，localStorage key `training-log-notes`（旧数组格式自动迁移）
- **训练思路**: `{ cells: string[7], sections: [] }`，localStorage key `training-log-plan`。sections 已迁移到 `/docs` 目录下的 .md 文件，旧数据首次启动自动迁移
- **docs 文档**: `/docs` 目录下的 Markdown 文件，通过 Express 后端 (`server.js`) 的 `/api/docs/*` API 进行读写
- **自定义标题**: `{ [key]: string }`，localStorage key `training-log-titles`，如 `plan`/`sections`/`notes`/`day-0`~`day-6`
- **侧栏标签名**: `{ [tabKey]: string }`，localStorage key `training-log-tab-labels`
- 训练记录可导入到专项计划：记录内容以 Markdown 格式追加到选中的文档文件

## 数据源

根目录 `训练.md` 是训练记录的权威数据源，由 `parse-training.js` 解析为 `训练数据导入.json` 后导入。

- 日期：月份取自日期前缀（`5.1` = 5月1日），年份取自 `### 2026.4` 标题
- 标签：标题关键词 + 内容关键词联合提取，无匹配时按星期回退
- 感受：关键词模式识别，其余归入内容

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 启动 Vite 开发服务器 (localhost:5173)
npm run dev:server   # 启动 Express 后端 (localhost:3001)
npm run dev:all      # 同时启动前端和后端（concurrently）
npm run build        # 生产构建到 dist/
npm run preview      # 预览生产构建
```