# SmartTask

> 一款高性能、易用的Obsidian智能任务管理插件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.0%2B-purple.svg)](https://obsidian.md)

## 演示视频

<a href="https://github.com/fat-pumpkin/SmarTask/raw/main/SmartTask-demo.mp4" target="_blank">
  <img src="https://img.shields.io/badge/%E8%A7%82%E7%9C%8B%E6%BC%94%E7%A4%BA-Video-blue?style=for-the-badge&logo=github" alt="观看演示">
</a>

点击上方徽章观看演示视频。

## 功能特性

### 多种视图

- **列表视图**：经典任务列表，支持分组、排序和可折叠章节
- **看板视图**：按优先级或状态分列显示，支持平滑拖拽
- **日历视图**：基于日期的任务分布，直观展示日程安排
- **时间线视图**：四种样式可选：
  - 交错时间线：左右交替卡片布局
  - 甘特图：按日/周/月显示任务条，从创建日期到截止日期

### 快速创建任务

- 紧凑的输入工具栏，截止日期和优先级以芯片形式内联显示
- 自动记录任务创建时间（🛫 开始时间），便于追溯
- 三种保存模式：
  - **收件箱**：保存到指定文件
  - **当前文件**：保存到当前编辑的文件
  - **每日笔记**：保存到今日的每日笔记
- 自动添加配置的标签

### 子任务支持

- 无限级子任务嵌套
- 子任务进度追踪
- 所有视图都支持子任务
- 快捷键 `Ctrl+Shift+Enter` 添加子任务

### 智能查询与筛选

- 按状态筛选（全部/待办/已完成）
- 按优先级筛选（最高/高/中/低/最低）
- 按标签筛选
- 按日期范围筛选
- 文本搜索
- 多字段排序（截止日期、优先级、描述、创建时间、完成时间）
- 多维分组（文件、优先级、截止日期、标签）

### Obsidian原生功能

- 任务描述中的 `[[Wiki链接]]` 渲染为可点击链接
- 任务描述中的 `#标签` 渲染为可点击元素，支持快速筛选
- 任务数据以Markdown格式存储，保留原始文件结构

### 性能优化

- 基于文件修改时间+大小的增量索引
- 批量处理（10ms让出），防止UI阻塞
- 虚拟滚动和防抖更新，支持大型知识库

## 安装

### 方法一：手动安装（推荐）

1. 下载最新的 [Release](https://github.com/fat-pumpkin/SmarTask/releases)
2. 将 `main.js`、`styles.css` 和 `manifest.json` 复制到您的知识库：
   ```
   <您的知识库>/.obsidian/plugins/smarttask/
   ```
3. 在Obsidian中打开 `设置 → 社区插件`，关闭安全模式
4. 找到 **SmartTask** 并启用

### 方法二：从源码构建

```bash
git clone https://github.com/fat-pumpkin/SmarTask.git
cd SmarTask
npm install
npm run build
```

将构建后的 `main.js` 和 `styles.css` 复制到插件目录。

## 使用

### 基本操作

| 操作 | 方式 |
|------|------|
| 打开SmartTask视图 | 点击侧边栏图标或运行命令 `Open SmartTask View` |
| 快速创建任务 | 命令面板 → `Quick Create Task`，快捷键 `Ctrl+Shift+T` |
| 切换任务状态 | 命令面板 → `Toggle Task Status`，快捷键 `Ctrl+Enter` |
| 添加子任务 | 命令面板 → `Add Subtask`，快捷键 `Ctrl+Shift+Enter` |

### 任务语法

任务使用标准Markdown复选框格式，支持以下元数据：

```markdown
- [ ] 任务描述 [[关联笔记]] #标签 📅 2026-07-15 🛫 2026-07-02 🔺
```

| 标记 | 含义 |
|------|------|
| `📅` | 截止日期 |
| `🛫` | 开始时间（创建时自动添加） |
| `🔝` | 最高优先级 |
| `🔺` | 高优先级 |
| `🔼` | 中优先级 |
| `🔽` | 低优先级 |
| `⏬` | 最低优先级 |
| `[[笔记名称]]` | Obsidian wiki链接 |
| `#标签` | 标签 |

### 视图切换

使用SmartTask视图顶部的工具栏在四种视图之间切换：
- 📋 列表视图
- 📌 看板视图
- 📅 日历视图
- 📊 时间线视图

时间线视图支持四种样式：经典、交错、卡片和甘特图。

## 设置

| 设置项 | 描述 | 默认值 |
|--------|------|--------|
| 默认保存位置 | 收件箱/当前文件/每日笔记 | 收件箱 |
| 收件箱文件路径 | 收件箱模式的文件路径 | `SmartTask-Inbox.md` |
| 自动添加标签 | 自动添加到新任务的标签 | 无 |
| 默认视图 | 插件打开时显示的视图 | 列表视图 |
| 默认优先级 | 新任务的优先级 | 中 |
| 显示已完成任务 | 在列表中显示已完成任务 | 关闭 |
| 时间线分组 | 按日/周/月分组 | 日 |
| 时间线样式 | 经典/甘特图/交错/卡片 | 经典 |

## 技术栈

- **TypeScript** + **esbuild** 构建
- **Obsidian Plugin API** 集成
- 原生DOM操作渲染UI

## 项目结构

```
├── src/
│   ├── main.ts           # 插件入口
│   ├── view.ts           # 视图注册
│   ├── smartTaskView.ts  # 视图渲染逻辑
│   ├── settings.ts       # 设置面板
│   ├── types.ts          # 类型定义
│   ├── taskParser.ts     # 任务解析器
│   ├── taskIndex.ts      # 任务索引引擎
│   ├── queryEngine.ts    # 查询引擎
│   └── i18n/             # 国际化翻译
├── main.js               # 构建输出
├── styles.css            # 样式表
├── manifest.json         # 插件清单
└── esbuild.config.mjs    # 构建配置
```

## 更新日志

### 1.0.2
- **新增**：标题行显示统计和进度条，便于快速概览
- **新增**：筛选面板使用标签输入模式（而非枚举列表），更好管理标签
- **新增**：增强搜索功能，支持描述、文件路径、标签和子任务
- **修复**：所有视图（列表、看板、时间线交错、甘特图）的标签显示一致性
- **修复**：所有视图的Wiki链接渲染一致性
- **修复**：进度条布局 - 进度条在左，百分比在右
- **移除**：未使用的Svelte组件文件，保持代码库整洁

### 1.0.1
- **修复**：甘特图样式清晰度 - 使用增强的颜色、边框和标签提高条可见性
- **修复**：移除未使用的变量和导入，提高代码质量
- **修复**：用Obsidian Modal替换 `confirm()`，提升用户体验
- **修复**：正则转义字符问题

### 1.0.0
- 初始版本发布
- 多种视图：列表、看板、日历、时间线
- 快速任务创建，支持内联芯片
- 子任务支持，无限嵌套
- 智能查询与筛选系统
- Obsidian原生功能集成
- 增量索引性能优化

## 版本发布

本项目使用GitHub Actions自动发布。创建标签触发发布工作流：

```bash
git tag 1.0.0
git push origin 1.0.0
```

GitHub Actions会自动构建并创建包含 `main.js`、`manifest.json` 和 `styles.css` 的Release，支持Obsidian在线更新。

## 许可证

[MIT License](LICENSE)
