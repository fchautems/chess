export interface CurriculumLesson {
  id: string
  index: number
  stageId: string
  title: string
  concept: string
  targetNodeId: string
  learnerMoveSequence: readonly string[]
  reproductionPrompt: string
  successMessage: string
}

export interface OpeningCurriculum {
  id: string
  openingId: string
  startNodeId: string
  lessons: readonly CurriculumLesson[]
}
