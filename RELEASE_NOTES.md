## MonoFocus Planner — updates 2.2

- **Week View — dnd-сортировка в бакете и днях**:
  - Добавлена drag & drop сортировка задач в бакете недели (desktop и mobile)
  - Добавлена drag & drop сортировка задач внутри каждого дня недели
  - Порядок задач сохраняется в `taskOrderByWeekBucket[week]` для бакета
  - Порядок задач в днях синхронизируется с Today через `taskOrderByDay[day]`
  - Для текущего дня Today является источником правды для порядка
  - Для будущих дней Week может устанавливать порядок
  - Созданы компоненты `SortableBucketTaskItem` и `SortableDayTaskItem` для обёртки существующих компонентов
  - Используется @dnd-kit с TouchSensor для мобильных устройств (delay: 250ms, tolerance: 8px)
  - Логика переноса задач между днями/бакетом не изменена (Move-модалка сохранена)
  - Порядок сохраняется после перезагрузки страницы

## MonoFocus Planner — updates 2.0

- **Inbox — major improvements**:
  - Visual unification: unified styling with other tabs (text-sm, text-xs, p-3, border, rounded-lg, shadow-sm)
  - Text truncation: long capture text is truncated with ellipsis in collapsed view
  - Click to expand: clicking on capture card opens edit form (removed separate "Process" button)
  - Inline editing: added ability to edit capture text directly in process form
  - Auto-expanding textarea: textarea automatically expands for long text
  - Save button: added checkmark button in top-right corner to save and close edit form
  - Keyboard shortcut: Ctrl+Enter (Cmd+Enter on Mac) to save capture text
  - Improved UX: cleaner interface with fewer buttons, more intuitive interaction
- **Inbox — Week synchronization**:
  - Fixed synchronization between Inbox and Week View
  - Tasks created with "today" now also set `plan.week` for consistency
  - Improved week selection logic for better accuracy
  - Removed 4-week limit: can now select any future week (no upper limit)
  - Better handling of week offsets across year boundaries

## MonoFocus Planner — updates 1.9.5

- **Inbox delete fix**:
  - Fixed delete functionality in Inbox view
  - Changed from archiving to permanent deletion of captures
  - Added `DELETE_CAPTURE` action to store
  - Updated confirmation modal text and styling to match delete action (danger variant)

## MonoFocus Planner — updates 1.9

- **Quick add tasks to week days**:
  - Added "+" button to each day block in Week view (centered between day name and task count)
  - Clicking "+" opens a modal to create a task for that specific day
  - Modal includes title input (required) and frog checkbox
  - New tasks are automatically added to the end of the day's task order
  - Works on both mobile and desktop
- **Export fix for mobile browsers**:
  - Fixed export functionality on mobile devices (PWA and browser)
  - Changed from `data:` URL to `Blob` + `URL.createObjectURL()` for better mobile compatibility
  - Export now works reliably on Android Chrome and other mobile browsers
- **Service Worker update fixes**:
  - Updated Service Worker cache version to v1.8 (was stuck on v1.6)
  - Changed caching strategy for JS/CSS files to "Network First" to ensure fresh updates
  - Added automatic page reload when new Service Worker is detected
  - Fixed issue where app updates weren't reaching mobile devices after version 1.7

## MonoFocus Planner — updates 1.8

- **Focus mode improvements**:
  - Removed focus start button from task add forms (mobile and desktop)
  - Added "Focus" button to expanded task view (right side, next to Edit button)
  - Edit button moved to center position in action buttons row
  - Focus can now be started for any task, not just the first one in the list
  - Focus mode works by task ID, not by position in list
  - Simplified logic: task remains in its position when focused (no removal/restoration needed since focus screen overlays entire UI)
  - After pausing focus, task stays in its original position in the list

## MonoFocus Planner — updates 1.7

- **PWA (Progressive Web App) implementation**:
  - Added `manifest.json` with app metadata, icons, and theme colors
  - Implemented Service Worker for offline functionality and static asset caching
  - Configured `display: standalone` for native app-like experience without browser UI
  - Automatic manifest path fixing for production builds (dev uses `/`, production uses `/Planer/`)
  - PNG icons (192x192 and 512x512) for better compatibility across devices
  - App can now be installed on Android Chrome and launched from home screen
  - Data still stored in localStorage; app works offline with cached static assets

## MonoFocus Planner — updates 1.6

- **Code refactoring and cleanup**:
  - Renamed `Focus.tsx` to `Today.tsx` for better structure clarity (focus mode is part of Today view, not vice versa)
  - Removed unused imports across all components (Target, X, Edit2, Check, CheckCircle, formatDateReadable)
  - Removed unused `onNavigate` parameter from TodayView component
  - All imports and references updated to reflect the new file structure
- **Development workflow improvements**:
  - Updated TODO.md with detailed implementation prompts for each feature
  - Added step-by-step development guidelines to minimize bugs and conflicts
  - Added pre-commit checklist to ensure code quality
  - Structured prompts for safe, incremental feature implementation

## MonoFocus Planner — updates 1.5.8

- **Week view task collapse/expand restored**:
  - Tasks in Week view (both bucket and days) now collapse by default, showing only title and Move button
  - Tap on task card expands it to show full text and action buttons (Delete, Edit, Done)
  - Fixed duplicate DayTaskItem component issue that prevented collapse/expand from working in day sections
  - All action buttons now properly stop event propagation to prevent conflicts

## MonoFocus Planner — updates 1.5.7

- **Week view edit reliability (mobile)**:
  - Extracted week task cards into stable components (bucket + day tasks) matching Today/Done patterns to avoid remount/state loss on mobile tap
  - Edit now mirrors Today/Done inline flow with consistent handlers; Delete/Done/Move unchanged

## MonoFocus Planner — updates 1.5.6

- **Week view edit behavior unified with other tabs**:
  - Refactored week task cards (bucket and days) to use the same inline edit pattern as Today/Done (isEditing + inline form instead of card)
  - Edit now swaps the card for a compact edit form (Title + Week + Frog + Save/Cancel) without any extra expand/collapse logic
  - Delete/Done/Move buttons kept intact but use the same button patterns as other views, reducing chances of mobile-specific click issues

## MonoFocus Planner — updates 1.5.5

- **Week view mobile layout simplification**:
  - Removed expand/collapse behavior for days and tasks in Week view; all day sections are always expanded
  - Task cards in Week now always show full text and all action buttons (Delete, Edit, Done, Move) without extra taps
  - Drag & drop remains disabled; moving tasks between days and bucket is done only via the explicit `Move` button and modal

## MonoFocus Planner — updates 1.5.4

- **Week view mobile tap fix — v2**:
  - Completely removed native HTML5 drag&drop from Week view tasks and day containers to avoid conflicts with touch events on real devices
  - Task cards and day headers now rely only on standard `onClick` behavior, so expand/collapse of tasks and days works on Android Chrome as in other tabs
  - Moving tasks between days and week bucket on mobile is done explicitly via the `Move` button and modal (no implicit drag on touch)

## MonoFocus Planner — updates 1.5.3

- **Week view mobile tap fix**:
  - Improved touch device detection (pointer, maxTouchPoints, touch events) to reliably disable native drag&drop on real phones
  - Task and day headers in Week now expand/collapse correctly on Android Chrome as in other tabs

## MonoFocus Planner — updates 1.5.2

- **Week view auto-expand fix**:
  - Auto-expand of days with tasks now runs only once when the week is loaded
  - After initial expansion, the user has full control over collapsing/expanding days; the effect no longer touches `expandedDays`

## MonoFocus Planner — updates 1.5.1

- **Week view hotfix**:
  - Fixed issue on mobile where tapping a day header briefly collapsed and then immediately re-expanded the day
  - Auto-expand logic no longer overrides user's manual collapse/expand choice; it only expands today/future days that have tasks and were never expanded before

## MonoFocus Planner — updates 1.5

- **Today & Week ordering fixes**:
  - Task order in Today is now stored only in `taskOrderByDay` (no per-task `order` field), eliminating reload glitches
  - Week view uses the same saved order for each day, so Today and Week always show tasks in identical order
  - Drag & drop / add / delete / complete operations all keep `taskOrderByDay` in sync
- **Carry-over tasks behavior**:
  - Unfinished tasks from past days are migrated to today's date on app load
  - Their week value is recalculated with `getWeekString(today)`, so Week view always shows them under the correct day/week
- **Week view cleanup**:
  - Completed tasks are no longer shown in Week; all done items live only in Done
  - Navigation to past weeks is disabled; you can only see the current and future weeks
  - In the current week, past days are hidden; their remaining TODO tasks automatically move into the week bucket (no date)
  - Week/day edit forms now validate week numbers strictly (1–52) without auto-inserting `0`, and allow direct year/week editing for bucket and day tasks
- **Done view logic**:
  - "Undone" is only available for tasks completed today; older completed tasks can be edited or deleted, but not reverted to TODO
  - Day groups are more compact and visually consistent with other lists
- **Text wrapping & layout**:
  - Long titles (including words без пробелов) no longer break layout; they wrap inside cards in Today, Week, Done, Events, Inbox
  - All task/event cards share unified padding (`p-3`), font sizes (`text-sm` for content, `text-xs` for meta), and button styles
- **Events & Inbox refinements**:
  - Past events block uses tighter spacing while keeping collapse/expand behavior
  - Event cards visually match task cards across the app
  - Inbox processing cards use the same compact card and text sizes
- **Settings & layout**:
  - Settings title centered; footer now shows explicit version label and storage info
  - Overall paddings reduced: smaller gutters from screen edges, tighter gaps between sections, so more content fits on screen
- **Backups & compatibility**:
  - Export format remains full `state` JSON; import still goes through `migrateAppState`
  - Older backups (до 1.5) are auto-mигрированы: отсутствующие поля (`taskOrderByDay`, `eventId` и пр.) добавляются с безопасными значениями, carry-over логика применяется после миграции

## MonoFocus Planner — updates 1.4

- **Task ordering persistence**: 
  - Drag & drop order in Today view now persists across tab switches and page reloads
  - Order synchronization between Today and Week views for the same day
  - Order stored in `taskOrderByDay` state field
- **Today view improvements**:
  - Done button changed to checkmark icon, moved to visible position (right side)
  - Edit button moved to expandable actions area
  - Play button moved to left of input field in add form
  - Long task titles expand with text wrapping when task is expanded
- **Edit forms improvements**:
  - Frog checkbox simplified: only checkbox and emoji (no text), positioned in same row with buttons
  - Multi-line textarea with auto-resize for long text editing in all views
- **Week view enhancements**:
  - "Week tasks (no date)" header centered
  - Task counter shows all week tasks (with and without day assignment): "X left • X done" + time spent
  - Long task titles expand with text wrapping when task is expanded
- **Events view major update**:
  - Task-like behavior: collapsed by default with truncated text, expandable to show full text and actions
  - Edit and Delete buttons in expandable area (matching task UI)
  - Improved add form: round button with plus icon, date/time above, input on left
  - Past events hidden in collapsible "Past events" section
  - Two-way synchronization with tasks: event changes update task, task changes update event
  - Deleting event deletes linked task, deleting task deletes linked event
  - Status changes (done/undone) don't affect event synchronization
- **Navigation**: Colored tab icons using app color palette (indigo, green, amber, purple, slate)
- **Data migration**: Full backward compatibility with previous versions, new fields (`taskOrderByDay`, `eventId`) auto-migrated

## MonoFocus Planner — updates 1.3

- **UI improvements**: Unified task management UI across all views (Week, Today, Done):
  - Only "Edit" button visible by default, action buttons (Delete, Done/Undone) appear in expandable block on click
  - Long task titles are truncated with ellipsis to prevent layout overflow
  - Consistent button styling and layout (Delete left, Edit/Done right)
- **Week view refinements**: 
  - Removed "All → Today" button from current day header
  - Removed "Today" option from mobile Move modal
  - Current day highlighted in Move modal
  - Improved spacing and layout
- **Events refactoring**: 
  - Events are now a separate entity (stored in `state.events`)
  - Creating an event creates an independent task copy (not linked)
  - Editing/deleting events does not affect the task copy
  - Enables future auto-cleanup of past events without affecting completed tasks
- **Navigation**: Swapped positions of "Done" and "Week" tabs

## MonoFocus Planner — updates 1.2

- **Week view enhancement**: Added day-by-day task management with drag-and-drop between days and week bucket.
- **Week view features**: Tasks can be moved between days, collapsed past days, "All → Today" button for current day.
- **Events as tasks**: Events are now created as tasks (with `projectId: 'event'`) and can be moved to Today like regular tasks.
- **Date/time formatting**: Unified date format (DD.MM.YYYY) and 24-hour time format throughout the app.
- **UI language**: All interface text translated to English.
- **Bug fix**: Fixed "Today" button in week day tasks not working.

## MonoFocus Planner — updates 1.1

- **Bug fix**: Tasks in Today view now persist to the next day if not completed (previously disappeared).
- **Backup improvements**: Enhanced import/export with full data validation and automatic migration.
- **Backup filename**: Export files now include date and time (format: `monofocus_backup_YYYY-MM-DD_HH-MM-SS.json`).
- **Data safety**: Improved error handling to prevent data loss during app updates.

## MonoFocus Planner — updates 1.0

- Unified Today/Focus: single Today screen with focus mode, timer, and drag-and-drop ordering.
- Tasks: add/edit/delete in Today, Week, Inbox; frog flag; move between buckets; done tasks auto-flow to Done with time spent.
- Timer: persistent across reloads; time tracked per focused task and shown in Done.
- Week: planner with week selector + date range, tasks move to Today when completed.
- Inbox: captures → plan as today/week with inline edit before conversion.
- Events: simple list with add/edit/delete, date/time/title, 24h format.
- Done: grouped by day with totals, collapsible, add done tasks.
- Navigation: mobile-first bottom bar; Today is primary; focus mode hides nav.
- Data: stored locally (localStorage), hydrated safely to avoid wipe on reload.

