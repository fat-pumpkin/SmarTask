# SmartTask

> 高性能、易操作的 Obsidian 智能任务管理插件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.0%2B-purple.svg)](https://obsidian.md)

## 功能特性

### 多视图展示
- **列表视图**：经典任务列表，支持分组、排序、折叠
- **看板视图**：按优先级或状态分列展示，拖拽体验流畅
- **日历视图**：按日期展示任务分布，直观查看日程
- **时间线视图**：支持经典、之字形、卡片、甘特图四种样式
  - 之字形时间线：左右交替排列，卡片式展示
  - 甘特图：按日/周/月三种粒度显示任务条，支持从创建时间到截止时间的完整跨度

### 快速创建任务
- 紧凑式输入工具栏，截止时间与优先级以标签芯片形式内联展示
- 自动记录任务创建时间（🛫 起始时间），便于追踪溯源
- 支持三种保存模式：
  - **收件箱**：保存到指定文件
  - **当前文件**：保存到当前编辑的文件
  - **每日笔记**：保存到今天的日记
- 自动添加配置的标签

### 子任务支持
- 任意层级嵌套子任务
- 子任务进度跟踪
- 所有视图均支持添加子任务
- 快捷键 `Ctrl+Shift+Enter` 添加子任务

### 智能查询与筛选
- 按状态筛选（全部 / 未完成 / 已完成）
- 按优先级筛选（最高 / 高 / 中 / 低 / 最低）
- 按标签筛选
- 按日期范围筛选
- 文本搜索
- 多字段排序（截止日期、优先级、描述、创建时间、完成时间）
- 多维度分组（文件、优先级、截止日期、标签）

### Obsidian 原生特性保留
- 任务描述中的 `[[双链]]` 渲染为可点击链接，跳转到对应笔记
- 任务描述中的 `#标签` 渲染为可点击元素，点击快速筛选
- 任务数据以 Markdown 格式存储，不破坏原有文件结构

### 状态栏集成
- 底部状态栏显示未完成任务总数（`📋 X 待办`）
- 任务变化时自动刷新

### 性能优化
- 基于文件 mtime + size 的增量索引
- 批量处理（10ms yield）避免 UI 阻塞
- 虚拟滚动与防抖更新，适配大型 Vault

## 安装

### 方式一：手动安装（推荐）

1. 下载最新版本的 [Release](https://github.com/fat-pumpkin/SmarTask/releases)
2. 将 `main.js`、`styles.css`、`manifest.json` 三个文件复制到你的 Vault 中：
   ```
   <你的Vault>/.obsidian/plugins/smarttask/
   ```
3. 在 Obsidian 中打开 `设置 → 第三方插件`，关闭安全模式
4. 找到 **SmartTask** 并启用

### 方式二：从源码构建

```bash
git clone https://github.com/fat-pumpkin/SmarTask.git
cd SmarTask
npm install
npm run build
```

构建产物 `main.js`、`styles.css` 复制到插件目录即可。

## 使用方法

### 基本操作

| 操作 | 方式 |
|------|------|
| 打开 SmartTask 视图 | 点击左侧边栏图标，或执行命令 `打开 SmartTask 视图` |
| 快速创建任务 | 命令面板 → `快速创建任务`，快捷键 `Ctrl+Shift+T` |
| 切换任务完成状态 | 命令面板 → `切换当前行任务状态`，快捷键 `Ctrl+Enter` |
| 添加子任务 | 命令面板 → `在当前任务下添加子任务`，快捷键 `Ctrl+Shift+Enter` |

### 任务语法

任务使用标准 Markdown Checkbox 格式，支持以下元数据标记：

```markdown
- [ ] 任务描述 [[关联笔记]] #标签 📅 2026-07-15 🛫 2026-07-02 🔺
```

| 标记 | 含义 |
|------|------|
| `📅` | 截止日期 |
| `🛫` | 起始时间（创建时自动添加） |
| `🔝` | 最高优先级 |
| `🔺` | 高优先级 |
| `🔼` | 中优先级 |
| `🔽` | 低优先级 |
| `⏬` | 最低优先级 |
| `[[笔记名]]` | Obsidian 双链 |
| `#标签` | 标签 |

### 视图切换

在 SmartTask 视图顶部工具栏可切换四种视图：
- 📋 列表视图
- 📌 看板视图
- 📅 日历视图
- 📊 时间线视图

时间线视图支持四种样式切换：经典、之字形、卡片、甘特图。

## 设置项

| 设置 | 说明 | 默认值 |
|------|------|--------|
| 默认保存位置 | 收件箱 / 当前文件 / 每日笔记 | 收件箱 |
| 收件箱文件路径 | 收件箱模式下的文件路径 | `SmartTask-Inbox.md` |
| 自动添加标签 | 新建任务自动附加的标签 | 无 |
| 默认视图 | 打开时的默认视图 | 列表视图 |
| 默认优先级 | 新任务的默认优先级 | 中 |
| 显示已完成任务 | 是否在列表中显示已完成任务 | 关闭 |
| 时间线分组 | 按日/周/月分组 | 日 |
| 时间线样式 | 经典/甘特图/之字形/卡片 | 经典 |

## 技术栈

- **TypeScript** + **esbuild** 构建
- **Svelte** 组件化 UI
- **Obsidian Plugin API** 集成

## 项目结构

```
├── src/
│   ├── main.ts           # 插件主入口
│   ├── view.ts           # 视图注册
│   ├── smartTaskView.ts  # 视图渲染逻辑
│   ├── settings.ts       # 设置面板
│   ├── types.ts          # 类型定义
│   ├── taskParser.ts     # 任务解析器
│   ├── taskIndex.ts      # 任务索引引擎
│   ├── queryEngine.ts    # 查询引擎
│   └── ui/               # Svelte 组件
├── main.js               # 构建产物
├── styles.css            # 样式文件
├── manifest.json         # 插件清单
└── esbuild.config.mjs    # 构建配置
```

## 版本发布

本项目使用 GitHub Actions 自动发布。创建 `v*` 格式的 tag 即可触发发布流程：

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动构建并创建 Release，包含 `main.js`、`manifest.json`、`styles.css` 三个文件，Obsidian 可据此进行在线更新。

## 许可证

[MIT License](LICENSE)
