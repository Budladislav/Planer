# MonoFocus Changelog

This is the user-facing release history. Dates for older versions were reconstructed from Git history.

## [4.0.0] — 04.09.2026 — Russian localization and long-term goals

### Added

- MonoFocus now has a complete Russian interface, with English available in Settings. Fresh installs follow the device language; existing installs open in Russian after the upgrade.
- Each day can hold multiple notes, available from Today, Weekly Plan day cards, and the Events calendar. Calendar note highlighting can be toggled independently.
- Settings now includes the experimental Long-term goals section with active, completed, and archived goals, current situation, next step, start and finish dates, and a progress-note timeline.
- TXT reports have a separate long-term goals section with an active-goal snapshot and goals completed during the selected range.
- TXT report and JSON backup buttons now show a download status that remains visible on phones.
- Expanded Today cards gained a Move to tomorrow command.
- The calendar can softly highlight the long break between first- and second-shift weeks, either Saturday–Sunday or Friday–Monday.

### Changed

- Inbox is now I wish in English and «Я хочу» in Russian; creation dates can be edited for both active and realized wishes.
- Today task editing now uses a compact pencil beside the completion control.
- Only the date number marks today in the calendar. Dates sit in the upper-left corner with compact event counts and note indicators.
- Shift labels are shortened to `1. shift` / `2. shift` and «1. смена» / «2. смена».

### Safety

- Planner storage moved to schema 6. Existing tasks, events, wishes, week notes, and settings are preserved while day notes, goals, and new preferences are migrated safely.
- JSON backup/import includes wishes, day notes, long-term goals, language, and the new calendar preferences automatically.

## [3.5.0] — 02.09.2026 — Progress reports

### Added

- Realized I wish entries can be renamed without returning them to the active list.
- Settings now includes Progress Reports with week, month, and custom date ranges.
- TXT reports include a separate section for realized wishes with creation and realization dates and elapsed time.

### Changed

- TXT report generation moved from Completed Tasks into its own Settings section.
- Completed tasks and realized wishes have separate headings, counters, and lists in reports.

## [3.4.1] — 02.09.2026 — Realized wish dates

### Added

- The realization date of a completed I wish entry can be edited; elapsed time is recalculated automatically.

### Changed

- The collapsible Realized section now appears above active wishes.

## [3.4.0] — 02.09.2026 — Realized wishes and current-day calendar

### Added

- I wish entries can be marked as realized without turning them into tasks.
- Realized entries appear in a collapsible list with creation, realization, and elapsed-time information.
- A realized entry can be returned to the active list.

### Changed

- The current date gained a distinct calendar treatment.

### Fixed

- Deleting a completed task now deducts its Rewards Lab points, including linked-event cascading deletion.
- Deleting a reopened task no longer deducts the same reward twice.

### Safety

- Local storage moved to schema 5 while preserving existing entries.

## [3.3.0] — 30.08.2026 — I wish and event calendar

### Added

- I wish entries display their creation date, recorded at creation time.

### Changed

- Past weeks in the Events calendar are collapsed by default.
- The in-app release history and changelog now share one canonical format.

### Safety

- Older entries without a creation date are safely backfilled on load.

## [3.2.0] — 29.08.2026 — Rewards Lab and task grades

### Added

- Settings gained an opt-in Rewards Lab experiment that disappears completely when disabled.
- Tasks gained Common, Uncommon, Rare, Legendary, and Mythic grades with ×1, ×1.5, ×2, ×3, and ×5 multipliers.
- Rewards use a fair local bag containing three 2s, three 3s, and three 4s per nine draws.
- Today gained a compact balance indicator; Rewards Lab gained a bank, personal rewards catalog, redemption history, and pilot statistics.

### Changed

- A first completion permanently records its grade and roll. Undo creates a compensating entry and completing again restores the original result.
- Experiment code loads only when enabled, keeping the disabled bundle impact below 5 KB gzip.

### Safety

- Rewards Lab uses separate local storage, stays outside planner backup/import, and is unaffected by Reset planner.
- Disable, Reset experiment, Disable & erase, `?safe=1`, isolated errors, and a pending-event queue keep planner tasks safe.

## [3.1.0] — 27.08.2026 — Week notes and availability calendar

### Added

- Today gained a persistent collapsible list of tasks completed today.
- Expanded task actions gained Done yesterday with correct history and report dates.
- Each ISO week can contain multiple editable notes displayed in Weekly Plan and Month Plan.
- Events gained a month calendar with shifts, week notes, and events.

### Changed

- Duplicate mobile page titles were hidden and each app launch starts in Today.
- Events are grouped into near, distant, and past sections with persistent expansion state.
- Past days and weeks are collapsed into compact sections.
- Work shifts stay hidden until configured and their settings moved into a collapsible Settings section.

### Safety

- Local storage moved to schema 4 and includes notes and UI preferences in backup/import.

## [3.0.0] — 16.08.2026 — Month planning

### Added

- Month Plan gained a month pool and week sections, including boundary weeks.
- Drag-and-drop works between month and week pools and between week pools and individual days.
- Alternating first and second work shifts can be configured from a base week with exceptions.

### Changed

- Month Plan, Weekly Plan, and Today share the same task entities.
- Weekly Plan can browse and edit past weeks.
- Move remains available as a touch-friendly alternative to drag-and-drop.
- Shift labels appear in Weekly Plan and Month Plan.
- Main navigation now contains Events, Month Plan, Weekly Plan, and Today.

### Safety

- Existing data receives a planning month automatically; shifts and ordering are included in backup/import.

## [2.7.0] — 16.08.2026 — Stability and compact interface

### Added

- Completed tasks can be exported to TXT for a week, month, or custom range.
- Added local-data migrations, explicit completion timestamps, strict type checks, linting, and automated tests.
- App version and release history are available from Settings.

### Changed

- Task cards and completion controls became more compact.
- I wish and Completed Tasks moved from main navigation into Settings.
- Completed linked events move immediately into Past events.

### Fixed

- Moving a dated task to another week now clears the day and places it in that week's pool.

### Removed

- Removed unused frogs and the unfinished statistics section.

### Safety

- External CDN UI dependencies were removed so styles remain available offline.

## [2.6.0] — 06.01.2026 — Statistics charts

### Added

- Added SVG charts and task/time switches for the experimental statistics section.
- Added day, week, month, and year groupings.

## [2.5.0] — 06.01.2026 — Experimental statistics

### Added

- Added an experimental statistics section with core metrics and period filters.

### Fixed

- Fixed card opening after dragging and long text in the week pool.

## [2.2.0] — 06.01.2026 — Weekly task ordering

### Added

- Added drag ordering inside the weekly pool and individual days.

### Changed

- Task order is synchronized between Week and Today and persists after restart.

## [2.0.0] — 06.01.2026 — I wish update

### Changed

- I wish gained the shared application design, in-card editing, and Ctrl/Cmd+Enter saving.

### Fixed

- Fixed week synchronization and removed the limit on choosing future weeks.

## [1.9.5] — 06.01.2026 — Safe I wish deletion

### Fixed

- Fixed permanent entry deletion and added destructive-action confirmation.

## [1.9.0] — 06.01.2026 — Quick planning and PWA updates

### Added

- Added quick task creation for a specific day in Week.

### Fixed

- Fixed mobile-browser backup export.

### Changed

- Service worker updates now use a more reliable release-delivery strategy.

## [1.8.0] — 06.01.2026 — Focus controls

### Changed

- Focus launch moved into each task's actions.
- A paused active task keeps its position.

## [1.7.0] — 06.01.2026 — Installable PWA

### Added

- MonoFocus became an installable PWA with offline cache, icons, and a standalone window.

### Safety

- Data remains stored only in the local browser.

## [1.6.0] — 06.01.2026 — Today rename and cleanup

### Changed

- Focus was renamed to Today and component structure and imports were cleaned up.

## [1.5.8] — 06.01.2026 — Reliable weekly cards

### Fixed

- Restored card collapsing in week pools and days.
- Fixed duplicate day-task components and card action handling.

## [1.5.7] — 06.01.2026 — Mobile Week stabilization

### Changed

- Week task cards moved into stable components for reliable mobile editing.

## [1.5.6] — 06.01.2026 — Unified task editing

### Changed

- Week task editing now matches Today and Completed Tasks.

## [1.5.5] — 06.01.2026 — Simplified mobile movement

### Changed

- Week's mobile interface was simplified; Move handles day-to-day movement.

## [1.5.4] — 06.01.2026 — Conflicting drag-and-drop removed

### Fixed

- Removed conflicting native drag-and-drop from Week.

## [1.5.3] — 06.01.2026 — Touch fixes

### Fixed

- Fixed touch-device detection and taps on Week cards and days.

## [1.5.2] — 06.01.2026 — Day expansion control

### Fixed

- Automatic day expansion now runs only on first open and no longer overrides user choice.

## [1.5.1] — 06.01.2026 — Repeat expansion fix

### Fixed

- Fixed a day reopening itself after manual collapse.

## [1.5.0] — 06.01.2026 — Today and Week synchronization

### Changed

- Today and Week share persistent task ordering.
- Overdue incomplete tasks move automatically to today.
- Completed tasks are hidden from Week and incomplete tasks from past current-week days return to the week pool.
- Cards and spacing became more compact and long titles display better.

### Safety

- Older backups migrate missing fields automatically.

## [1.4.0] — 05.01.2026 — Saved order and linked events

### Added

- Events gained two-way task linking, editing, and past-event history.

### Changed

- Dragged task ordering persists and synchronizes between Today and Week.
- Today and Week cards, editing forms, and long-title display were improved.

## [1.3.0] — 04.01.2026 — Unified tasks and events

### Added

- Events became standalone entities.

### Changed

- Task handling is unified across Week, Today, and Completed Tasks.
- Week actions and movement were simplified.

## [1.2.0] — 04.01.2026 — Weekly planning

### Added

- Added weekly day planning and movement between days and the week pool.
- Events started creating linked dated tasks.

### Changed

- Date and time formats were unified and the interface switched to English.

## [1.1.0] — 04.01.2026 — Reliable task movement

### Fixed

- Incomplete Today tasks no longer disappear when a new day starts.
- Improved validation, migration, and backup naming.

## [1.0.0] — 01.01.2026 — First stable release

### Added

- Created Today with Focus mode, timer, and ordering; Week; I wish; Events; and Completed Tasks.
- Added task creation, editing, completion, and movement.
- Added local persistence and safe state restoration after restart.
