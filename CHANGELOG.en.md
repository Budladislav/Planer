# Takt Changelog

This is the user-facing release history. Dates for older versions were reconstructed from Git history.

## [5.0.0] — 08.09.2026 — Takt and “Quiet Depth”

### Added

- MonoFocus has been renamed to Takt, with a new name, refreshed PWA icons, and a four-step mark rising from green to red.
- Added a compact internal design system for surfaces, task cards, fields, buttons, disclosures, sticky composers, and dialogs.

### Changed

- Refreshed the interface with a calm cool light palette, deep indigo core accent, clearer hierarchy, consistent rhythm, and restrained shadows.
- Today, Week, Month, Events, Inbox, Goals, Done, Reports, Settings, and Rewards Lab now share one visual language without changing familiar structure or workflows.
- Navigation is monochrome, mobile screens remain compact, and forms and sheets better account for the bottom dock and short viewports.
- Grade colors are now consistent: Common stays neutral, Uncommon is green, Rare is blue, Legendary is amber, and Mythic is red.
- Lazy-loaded screens and the local-first architecture remain intact; no new UI framework or external fonts were added.

### Fixed

- Dialogs now trap keyboard focus, close with Escape, and restore focus to the element that opened them.
- Unified inconsistent spacing, radii, focus states, and empty-state treatments that had accumulated across screens.

### Safety

- Internal local-storage keys and the legacy PWA cache namespace remain unchanged, so the update neither migrates nor deletes user data.
- Rewards Lab remains isolated from the planner state and planner backups.

## [4.3.1] — 08.09.2026 — Reliable PWA updates

### Fixed

- The installed PWA no longer remains blank when stale HTML references a JavaScript asset removed by a newer deployment. Failed network responses for JavaScript and CSS now correctly fall back to a cached copy.
- The new service worker claims and reloads an open PWA once after activation, recovering the application without reinstallation.

### Changed

- The application document now uses network-first loading with an offline fallback, while service-worker registration lives in stable page bootstrap code outside the hashed application bundle.
- The three latest available application caches are retained for safe release transitions; older versions are removed automatically.

### Safety

- This repair changes PWA file delivery only. Tasks, events, settings, and the separate Rewards Lab data are neither read nor modified nor reset.

## [4.3.0] — 08.09.2026 — Planner without a timer

### Removed

- Removed Focus mode, the task timer, the full-screen focus view, and their related actions.
- Completion duration no longer appears in Today, the week plan, completed-task history, or TXT reports.

### Changed

- The core data schema is now version 7. Loading or importing an older backup preserves its tasks while discarding obsolete timing and active-timer fields.
- Product descriptions now reflect the current month-to-day planning workflow.

### Safety

- Migration leaves task titles, statuses, dates, plans, and event links unchanged. Rewards Lab credits, keys, and transaction history are unaffected.
- New JSON backups contain no timer data, while older backups remain safe to import.

## [4.2.1] — 08.09.2026 — Colored keys and quick grade promotion

### Added

- Collapsed Today, Week, and Month cards now have a compact one-step grade promotion button. It leaves the card collapsed and previews the next grade's color; the full five-grade selector remains available in expanded actions.

### Changed

- Common, Uncommon, Rare, Legendary, and Mythic key icons now use their grade colors in the inventory, transaction history, and drop notification.

### Safety

- This patch changes presentation and the quick grade-selection path only. The economy version, probabilities, accumulated credits, keys, and transaction history remain unchanged.

## [4.2.0] — 07.09.2026 — Reward keys and Economy v3

### Added

- A completed task can now drop one of five reward-key grades, from Common to Mythic. Each task grade has its own probability matrix, while protected randomness increases the Common-key chance after a dry streak and guarantees one on the eighth attempt.
- Five keys of one grade can be explicitly upgraded into one key of the next grade. The latest upgrade can be undone while its output key remains unspent.
- Redeeming a reward now requires both credits and an exact-grade key. Rewards support editable cooldowns, rolling-period limits, shared limit groups, and actual-price entry.
- An editable starter catalog covers small treats, games, outings, hobbies, and optional purchases. Existing non-empty catalogs receive templates only on request and without duplicates.
- Rewards Lab gained an isolated optional-purchases list with an estimate or price range, grade, link, note, and statuses from idea to purchased.

### Changed

- The default currency name changed from Tokens to Credits; custom currency names are preserved.
- Rewards Economy v3 separates credit payouts from key drops. Undo and recompletion restore the original outcome without a reroll, while correcting a grade changes only credits and never replaces an already dropped key.
- Rewards Lab summary, history, and rules now include key balances, upgrades, the economy version, and the catalog's new constraints.

### Fixed

- Task cards with a selected grade no longer dim or desaturate their full content: grade is communicated through a colored side accent and marker.
- Undoing a task cannot make its linked key reusable: an available key is suspended, while spent or upgraded keys retain their state. Refunding a later purchase returns that key to suspended status.

### Safety

- Every Economy v1 and v2 claim, wallet entry, balance, and user catalog migrates without recalculation. Economy v3 applies only to new completions.
- Keys, the purchases list, and the entire Rewards Lab remain in separate local storage and stay outside the planner JSON backup.

## [4.1.0] — 06.09.2026 — Rewards Economy v2 and interface performance

### Added

- Rewards Lab now shows current-week and current-month results: earned amount, completed-task count, and grade distribution.
- Uncommon, Rare, Legendary, and Mythic task cards have a subtle tinted surface and side accent in Today, Week, and Month; completed-task lists retain a compact grade marker.
- Lab history shows the economy version for task transactions and separate records for grade corrections.

### Changed

- Rewards Economy v2 gives each grade a strict non-overlapping corridor: Common 1–2, Uncommon 3–4, Rare 5–8, Legendary 9–15, and Mythic 16–30.
- Randomness now uses one fair bag of nine hidden luck slots. A higher grade always pays more than every lower grade, while each full cycle uses every slot exactly once.
- After Undo, a task grade can be corrected. The original luck is retained, no new draw occurs, and recompletion awards the corrected amount under the claim's original economy version.
- Earned total, available balance, spent points, and rewards received are now distinct metrics; reward-price hints use Economy v2 Common-task values.
- Settings, Completed Tasks, Progress Reports, and Long-term Goals are loaded only when first opened and remain available offline.
- The large Week and Rewards Lab screens were split into focused components without changing their established behavior.

### Fixed

- Removed overlapping grade payouts that could make a difficult task pay the same as or less than a Common task.
- Grade correction no longer needs a new random result and cannot be used with repeated Undo actions to obtain extra draws.
- The first Today task no longer receives an unrelated purple outline; task cards now differ only through meaningful states and their selected grade.

### Safety

- Every Economy v1 claim, wallet entry, catalog reward, and accumulated balance is preserved without recalculation. Economy v2 starts its own fresh fair-bag cycle.
- Rewards Lab remains separate from the main MonoFocus state and excluded from planner JSON backups.

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
- Weekly Plan keeps each day note on the same line as its date instead of increasing the header height.
- Month Plan keeps shift and week-note metadata beside the week number and date range in one compact row.
- Event-calendar date numbers are pinned to the upper-left corner of their cells.
- Events is now Calendar, the calendar appears above the event lists, and Month Plan / Weekly Plan are shortened to Month / Week.
- Wish is now the first main-navigation item, followed by Month before Calendar.
- Active wishes now use the same compact pencil editing as realized wishes; expanding a wish and converting it into a task have been removed.
- Shift labels are shortened to `1. shift` / `2. shift` and «1. смена» / «2. смена».

### Fixed

- Fixed a Weekly Plan update loop that accumulated `Maximum update depth exceeded` errors and could prevent navigation between sections.

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
