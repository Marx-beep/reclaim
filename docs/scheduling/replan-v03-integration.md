# Replan v03 Logic Integration

This document records how `reclaim_v03` dynamic replan assets were integrated into the current monorepo.

## Integrated scope

The following logic is now built into `services/scheduler`:

1. Task replan rules
2. Adjustment strategy for delayed, early-finished, added, deleted tasks
3. Task shift/compress + buffer insertion rules
4. New time-block generation and undo token flow

## New runtime module

- `services/scheduler/app/core/event_replan.py`

This module ports the event-driven rule engine into production scheduler service with:

- `POST /schedule/event-replan`
- `POST /schedule/event-replan/undo`

## Covered event types

- `task_delayed`
- `task_finished_early`
- `task_moved`
- `task_resized`
- `task_added`
- `task_deleted`
- `burnout`

## Key constraints kept

- Hard tasks (`priority = S`) cannot be auto-moved or resized
- Work tasks must stay inside work segments (`09:00-12:00`, `14:00-18:00`)
- Minimum task slice duration is 10 minutes
- Buffer insertion between work blocks with daily cap
- Deadline-aware placement and split generation

## Tests added

- `services/scheduler/tests/test_event_replan.py`

Includes:

- delayed task replan
- early-finish compression
- add/delete adjustments
- buffer insertion + undo flow

## Archived source assets

Original v03 files are archived under:

- `docs/archive/reclaim_v03/`

The original source directory `C:\Users\cwh18\Desktop\reclaim_v03\reclaim_v03` was removed after migration.
