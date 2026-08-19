import type {
  PersistedTrainingPhase,
  PlayerProgressV1,
  ProgressRepository,
} from '../../application/progress/ProgressRepository'

interface StoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const STORAGE_KEY = 'chess-openings-trainer.progress'

const phases = new Set<PersistedTrainingPhase>([
  'discovery',
  'ready-to-reproduce',
  'reproduction',
  'lesson-complete',
  'curriculum-complete',
])

function parseProgress(serialized: string): PlayerProgressV1 {
  const value: unknown = JSON.parse(serialized)

  if (!value || typeof value !== 'object') {
    throw new Error('La sauvegarde ne contient pas un objet valide.')
  }

  const candidate = value as Partial<PlayerProgressV1>

  if (candidate.schemaVersion !== 1) {
    throw new Error('Version de sauvegarde non prise en charge.')
  }

  if (
    typeof candidate.activeLessonId !== 'string' ||
    !candidate.phase ||
    !phases.has(candidate.phase) ||
    !Array.isArray(candidate.completedLessonIds) ||
    !candidate.completedLessonIds.every((id) => typeof id === 'string')
  ) {
    throw new Error('La sauvegarde est incomplète ou corrompue.')
  }

  return {
    schemaVersion: 1,
    activeLessonId: candidate.activeLessonId,
    phase: candidate.phase,
    completedLessonIds: [...new Set(candidate.completedLessonIds)],
  }
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: StoragePort,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): PlayerProgressV1 | null {
    let serialized: string | null

    try {
      serialized = this.storage.getItem(this.key)
    } catch {
      return null
    }

    if (!serialized) {
      return null
    }

    try {
      return parseProgress(serialized)
    } catch {
      return null
    }
  }

  save(progress: PlayerProgressV1): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(progress))
    } catch {
      // Training remains usable when browser storage is unavailable.
    }
  }

  reset(): void {
    try {
      this.storage.removeItem(this.key)
    } catch {
      // Nothing else to reset when browser storage is unavailable.
    }
  }

  exportData(): string | null {
    try {
      return this.storage.getItem(this.key)
    } catch {
      return null
    }
  }

  importData(serialized: string): PlayerProgressV1 {
    const progress = parseProgress(serialized)
    this.save(progress)
    return progress
  }
}
