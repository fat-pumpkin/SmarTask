# Changelog

## [2.0.1] - 2026-07-22

### ✨ 新增

- 自定义复选框组件，任务完成时带勾选动画反馈（借鉴 uiverse.io 设计语言）
- 索引初始化与查询期间显示骨架屏加载态，避免界面"卡死"错觉
- CSS Tooltip 替代原生 `title` 属性，统一 hover 提示样式
- 主操作按钮（添加 / 筛选 tab）增加 ripple/glow 微交互
- Empty State 视觉升级：插画式图标 + 引导按钮
- 看板视图支持 HTML5 拖拽：在"待办"与"已完成"列间拖动任务以切换状态
- 任务列表键盘导航：↑/↓ 移动聚焦、Space 切换完成、E 编辑、Esc 关闭面板
- 搜索框 debounce（150ms），减少按键触发的全量重渲染
- `getAllTags()` 结果缓存，任务变更时自动失效
- 任务项无障碍属性：`role`/`aria-label`/`tabindex`，Modal 焦点陷阱

### 🔧 优化

- 功能区 Row2 按钮标签外置并排显示，按钮统一方形尺寸，等宽分布占满整行
- 功能区 Row1 统计项（待办/逾期/今日/近期/进度条）调大尺寸，加阴影边框与 hover 效果
- 日历视图任务条加大尺寸并显示任务描述，强化优先级色块区分（左边框 + 背景色 + 优先级图标）
- 设置页全部文案迁移到 i18n（en/zh），About 版本号动态读取 manifest.version
- queryTasks 委托 QueryEngine.query，消除重复筛选逻辑
- onload 尊重 indexingEnabled 配置，支持设置页热切换索引开关
- 主操作图标改用 Obsidian 内置 `setIcon()`（lucide），替代部分 emoji，主题适配更一致
- Priority 配色统一走 `--priority-*` CSS 变量，浅/深主题下均可读
- Filter Tab 切换改为局部 class 切换，不再整体 remove+重建，保留滚动位置
- QuickCreateModal 与侧边栏快速创建面板抽公共 helper，消除重复实现
- 移动端添加面板输入框布局修复，textarea `min-width: 0` 确保 flex 正确收缩

### 🐛 修复

- 修复 smartTaskView.ts 中统计标签、Row2 按钮文案、placeholder 等 12+ 处中文硬编码（绕过 i18n 的回归）
- 修复子任务插入：基于父任务原始缩进计算子缩进，插入到父任务子树末尾
- 修复添加任务后输入框跳到页面顶部的 DOM 重排 bug
- 修复 QuickCreateModal 与 ViewController 中 setTimeout 未清理问题
- 6 处硬编码 hex 颜色改为 CSS 变量（var(--priority-*) / var(--text-error)）
- 4 处 setTimeout magic number 提取为具名常量
- 日历任务条在 768px/480px 断点的响应式样式补齐
- 480px 极窄屏下 Row2 按钮区 flex-wrap 换行，避免 6 个按钮挤压溢出

### 📚 文档

- README 校准：移除"虚拟滚动"等不实宣传，明确看板拖拽的实际能力边界
- 补充 Obsidian 社区审核合规说明（LICENSE / 无网络请求 / 无遥测）

## [2.0.0] - 2026-07-15

- 功能区 Row2 按钮标签外置并排显示
- 功能区 Row1 统计项样式强化
- 日历视图任务条优化
- 设置页 i18n 迁移
- queryTasks 委托 QueryEngine
- onload 尊重 indexingEnabled 配置

## [1.0.6] - 2026-07-14

- 修复 `versions.json` 中版本映射错误
- 发布 1.0.6 恢复 Obsidian 社区插件正常状态

## [1.0.5] - 2026-07-13

- 移动端输入框 / 功能栏 / 看板 / 交错时间线响应式修复
- 操作按钮统一为 meta-action-btn 样式
- 移除所有 CSS 中的 `!important`

## [1.0.4] - 2026-07-13

- 添加移动端响应式布局适配

## [1.0.0] - 2026-07-12

- 初始发布：多视图任务管理 / 快速创建 / 智能查询 / 子任务管理 / 优先级与日期管理
