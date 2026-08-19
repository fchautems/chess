export type PersistedTrainingPhase =
  | 'discovery'
  | 'ready-to-reproduce'
  | 'reproduction'
  | 'lesson-complete'
  | 'curriculum-complete'

export interface PlayerProgressV1 {
  schemaVersion: 1
  activeLessonId: string
  phase: PersistedTrainingPhase
  completedLessonIds: readonly string[]
}

export interface ProgressRepository {
  load(): PlayerProgressV1 | null
  save(progress: PlayerProgressV1): void
  reset(): void
  exportData(): string | null
  importData(serialized: string): PlayerProgressV1
}
