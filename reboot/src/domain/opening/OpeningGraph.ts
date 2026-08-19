import type { LessonStage } from '../curriculum/LessonStage'
import type { OpeningNode } from './OpeningNode'

export class OpeningGraph {
  private readonly nodeById: ReadonlyMap<string, OpeningNode>
  private readonly stageById: ReadonlyMap<string, LessonStage>

  constructor(
    readonly id: string,
    readonly title: string,
    nodes: readonly OpeningNode[],
    stages: readonly LessonStage[],
  ) {
    this.nodeById = new Map(nodes.map((node) => [node.id, node]))
    this.stageById = new Map(stages.map((stage) => [stage.id, stage]))
    this.assertValid(nodes, stages)
  }

  getNode(nodeId: string): OpeningNode {
    const node = this.nodeById.get(nodeId)

    if (!node) {
      throw new Error(`Unknown opening node: ${nodeId}`)
    }

    return node
  }

  getStage(stageId: string): LessonStage {
    const stage = this.stageById.get(stageId)

    if (!stage) {
      throw new Error(`Unknown curriculum stage: ${stageId}`)
    }

    return stage
  }

  allNodes(): readonly OpeningNode[] {
    return [...this.nodeById.values()]
  }

  private assertValid(
    nodes: readonly OpeningNode[],
    stages: readonly LessonStage[],
  ): void {
    if (this.nodeById.size !== nodes.length) {
      throw new Error('Opening graph contains duplicate node ids')
    }

    if (this.stageById.size !== stages.length) {
      throw new Error('Curriculum contains duplicate stage ids')
    }

    for (const node of nodes) {
      if (!this.stageById.has(node.curriculumStageId)) {
        throw new Error(
          `Node ${node.id} references unknown stage ${node.curriculumStageId}`,
        )
      }

      if (node.theoreticalImportance < 0 || node.theoreticalImportance > 1) {
        throw new Error(`Node ${node.id} has invalid theoretical importance`)
      }

      for (const prerequisite of node.prerequisites) {
        if (!this.nodeById.has(prerequisite)) {
          throw new Error(
            `Node ${node.id} references unknown prerequisite ${prerequisite}`,
          )
        }
      }

      const moves = [
        ...node.acceptedLearnerMoves,
        ...node.opponentMoves,
      ]

      for (const move of moves) {
        if (!this.nodeById.has(move.targetNodeId)) {
          throw new Error(
            `Move ${move.san} from ${node.id} targets unknown node ${move.targetNodeId}`,
          )
        }
      }
    }

    for (const stage of stages) {
      if (!this.nodeById.has(stage.entryNodeId)) {
        throw new Error(
          `Stage ${stage.id} references unknown entry node ${stage.entryNodeId}`,
        )
      }

      for (const criticalNodeId of stage.criticalNodeIds) {
        if (!this.nodeById.has(criticalNodeId)) {
          throw new Error(
            `Stage ${stage.id} references unknown critical node ${criticalNodeId}`,
          )
        }
      }
    }
  }
}
