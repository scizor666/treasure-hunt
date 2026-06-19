import { HEALTH } from '../config';

/**
 * Per-run state shared across scenes via the Phaser registry.
 * HP persists across Level 1 -> Level 2; only death (0 HP) resets the run. (§3.1)
 */
export interface RunState {
  levelIndex: number; // 0-based: 0 = Level 1, 1 = Level 2
  hp: number;
}

const KEY = 'run';

export const LEVEL_KEYS = ['level-1', 'level-2'] as const;
export const LEVEL_COUNT = LEVEL_KEYS.length;

export function newRun(): RunState {
  return { levelIndex: 0, hp: HEALTH.startHP };
}

export function getRun(registry: Phaser.Data.DataManager): RunState {
  return (registry.get(KEY) as RunState | undefined) ?? newRun();
}

export function setRun(registry: Phaser.Data.DataManager, state: RunState): void {
  registry.set(KEY, state);
}

export function resetRun(registry: Phaser.Data.DataManager): void {
  registry.set(KEY, newRun());
}
