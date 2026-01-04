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

