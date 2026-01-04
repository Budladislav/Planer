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

