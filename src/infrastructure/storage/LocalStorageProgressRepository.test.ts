import { describe, expect, it } from 'vitest'

import { LocalStorageProgressRepository } from './LocalStorageProgressRepository'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

describe('LocalStorageProgressRepository', () => {
  it('saves, loads, exports and resets schema v1 progress', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())
    const progress = {
      schemaVersion: 1 as const,
      activeLessonId: 'lesson-nf3',
      phase: 'reproduction' as const,
      completedLessonIds: ['lesson-e4'],
    }

    repository.save(progress)
    expect(repository.load()).toEqual(progress)
    expect(repository.exportData()).toContain('lesson-nf3')

    repository.reset()
    expect(repository.load()).toBeNull()
  })

  it('rejects corrupt or unsupported imported data', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())

    expect(() => repository.importData('{"schemaVersion":2}')).toThrow(
      'Version de sauvegarde non prise en charge',
    )
    expect(() => repository.importData('not-json')).toThrow()
  })

  it('deduplicates lesson ids when importing debug data', () => {
    const repository = new LocalStorageProgressRepository(new MemoryStorage())
    const imported = repository.importData(
      JSON.stringify({
        schemaVersion: 1,
        activeLessonId: 'lesson-nf3',
        phase: 'discovery',
        completedLessonIds: ['lesson-e4', 'lesson-e4'],
      }),
    )

    expect(imported.completedLessonIds).toEqual(['lesson-e4'])
  })
})
