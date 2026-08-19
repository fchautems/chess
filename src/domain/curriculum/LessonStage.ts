export interface LessonStage {
  id: string
  index: number
  title: string
  description: string
  entryNodeId: string
  criticalNodeIds: readonly string[]
}
