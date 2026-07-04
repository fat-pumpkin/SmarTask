# SmartTask

> A high-performance, user-friendly smart task management plugin for Obsidian

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.0%2B-purple.svg)](https://obsidian.md)

## Features

### Multiple Views

- **List View**: Classic task list with grouping, sorting, and collapsible sections
- **Kanban View**: Column-based display by priority or status with smooth drag-and-drop
- **Calendar View**: Date-based task distribution for intuitive schedule visualization
- **Timeline View**: Four styles available:
  - Zigzag Timeline: Alternating left-right card layout
  - Gantt Chart: Task bars displayed by day/week/month, spanning from creation to due date

### Quick Task Creation

- Compact input toolbar with due date and priority displayed as inline chips
- Auto-record task creation time (🛫 start time) for easy tracking
- Three save modes:
  - **Inbox**: Save to a specified file
  - **Current File**: Save to the currently edited file
  - **Daily Note**: Save to today's daily note
- Auto-add configured tags

### Subtask Support

- Unlimited nesting levels for subtasks
- Subtask progress tracking
- Subtask support across all views
- Shortcut `Ctrl+Shift+Enter` to add subtasks

### Smart Query & Filter

- Filter by status (All / Uncompleted / Completed)
- Filter by priority (Highest / High / Medium / Low / Lowest)
- Filter by tags
- Filter by date range
- Text search
- Multi-field sorting (due date, priority, description, creation time, completion time)
- Multi-dimensional grouping (file, priority, due date, tag)

### Obsidian Native Features

- `[[Wiki Links]]` in task descriptions render as clickable links
- `#Tags` in task descriptions render as clickable elements for quick filtering
- Task data stored in Markdown format, preserving original file structure

### Performance Optimization

- Incremental indexing based on file mtime + size
- Batch processing (10ms yield) to prevent UI blocking
- Virtual scrolling and debounced updates for large vaults

## Installation

### Method 1: Manual Installation (Recommended)

1. Download the latest [Release](https://github.com/fat-pumpkin/SmarTask/releases)
2. Copy `main.js`, `styles.css`, and `manifest.json` to your Vault:
   ```
   <YourVault>/.obsidian/plugins/smarttask/
   ```
3. Open `Settings → Community plugins` in Obsidian and disable safe mode
4. Find **SmartTask** and enable it

### Method 2: Build from Source

```bash
git clone https://github.com/fat-pumpkin/SmarTask.git
cd SmarTask
npm install
npm run build
```

Copy the built `main.js` and `styles.css` to the plugin directory.

## Usage

### Basic Operations

| Action | Method |
|--------|--------|
| Open SmartTask View | Click sidebar icon or run command `Open SmartTask View` |
| Quick Create Task | Command Palette → `Quick Create Task`, shortcut `Ctrl+Shift+T` |
| Toggle Task Status | Command Palette → `Toggle Task Status`, shortcut `Ctrl+Enter` |
| Add Subtask | Command Palette → `Add Subtask`, shortcut `Ctrl+Shift+Enter` |

### Task Syntax

Tasks use standard Markdown Checkbox format with support for the following metadata:

```markdown
- [ ] Task description [[Linked Note]] #tag 📅 2026-07-15 🛫 2026-07-02 🔺
```

| Marker | Meaning |
|--------|---------|
| `📅` | Due date |
| `🛫` | Start time (auto-added on creation) |
| `🔝` | Highest priority |
| `🔺` | High priority |
| `🔼` | Medium priority |
| `🔽` | Low priority |
| `⏬` | Lowest priority |
| `[[Note Name]]` | Obsidian wiki link |
| `#tag` | Tag |

### View Switching

Switch between four views using the toolbar at the top of the SmartTask view:
- 📋 List View
- 📌 Kanban View
- 📅 Calendar View
- 📊 Timeline View

Timeline view supports four styles: Classic, Zigzag, Card, and Gantt.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default Save Location | Inbox / Current File / Daily Note | Inbox |
| Inbox File Path | File path for inbox mode | `SmartTask-Inbox.md` |
| Auto-add Tags | Tags automatically added to new tasks | None |
| Default View | View shown on plugin open | List View |
| Default Priority | Priority for new tasks | Medium |
| Show Completed Tasks | Display completed tasks in list | Off |
| Timeline Grouping | Group by day/week/month | Day |
| Timeline Style | Classic/Gantt/Zigzag/Card | Classic |

## Tech Stack

- **TypeScript** + **esbuild** for building
- **Svelte** for componentized UI
- **Obsidian Plugin API** for integration

## Project Structure

```
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── view.ts           # View registration
│   ├── smartTaskView.ts  # View rendering logic
│   ├── settings.ts       # Settings panel
│   ├── types.ts          # Type definitions
│   ├── taskParser.ts     # Task parser
│   ├── taskIndex.ts      # Task indexing engine
│   ├── queryEngine.ts    # Query engine
│   └── ui/               # Svelte components
├── main.js               # Build output
├── styles.css            # Stylesheet
├── manifest.json         # Plugin manifest
└── esbuild.config.mjs    # Build configuration
```

## Changelog

### v1.0.1
- **Fixed**: Gantt chart style clarity - improved bar visibility with enhanced colors, borders, and labels
- **Fixed**: Removed unused variables and imports for better code quality
- **Fixed**: Replaced `confirm()` with Obsidian Modal for better UX
- **Fixed**: Regex escape character issues

### v1.0.0
- Initial release
- Multiple views: List, Kanban, Calendar, Timeline
- Quick task creation with inline chips
- Subtask support with unlimited nesting
- Smart query & filter system
- Obsidian native features integration
- Performance optimization with incremental indexing

## Version Release

This project uses GitHub Actions for automatic releases. Create a tag in `v*` format to trigger the release workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically build and create a Release with `main.js`, `manifest.json`, and `styles.css`, enabling Obsidian to perform online updates.

## License

[MIT License](LICENSE)