/** Lightweight key shared by the startup gate and the isolated storage adapter. */
export const REWARDS_LAB_EXPERIMENT_FLAGS_KEY = 'takt:rewards:flags:v1';

/** Read-only legacy keys retained by 6.0 so the pilot can never be erased silently. */
export const LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY = 'monofocus:experiments:v1';
export const LEGACY_REWARDS_LAB_STORAGE_KEY = 'monofocus:rewards-lab:v1';
export const LEGACY_REWARDS_LAB_OUTBOX_KEY = 'monofocus:rewards-lab:lifecycle-outbox:v1';
export const LEGACY_REWARDS_LAB_ARCHIVE_KEY = 'takt:rewards:legacy-lab-archive:v1';
