/**
 * DualChainProcessor — Reasoning Engine
 * Task 62
 */

export interface ReasoningChain {
  chain_id: string
  conclusion: string
  reasoning_steps: string[]
  confidence: number
  key_claims: string[]
}

export interface ReasoningConflict {
  chain_a: ReasoningChain
  chain_b: ReasoningChain
  contradictions: string[]
  requires_human_review: true
}

export interface MergedConclusion {
  conclusion: string
  confidence: number
  supporting_chains: [string, string]
  merged_at: string
}

export type DualChainResult =
  | { type: 'CONFLICT'; conflict: ReasoningConflict }
  | { type: 'MERGED'; merged: MergedConclusion }

export interface DualChainTask {
  task_id: string
  prompt: string
  context: Record<string, unknown>
}

export interface ChainGenerator {
  generate(task: DualChainTask, chainId: string): Promise<ReasoningChain>
}

export class DefaultChainGenerator implements ChainGenerator {
  async generate(task: DualChainTask, chainId: string): Promise<ReasoningChain> {
    return {
      chain_id: chainId,
      conclusion: `Conclusion from ${chainId} for task ${task.task_id}`,
      reasoning_steps: [`Step 1 (${chainId})`, `Step 2 (${chainId})`],
      confidence: 0.8,
      key_claims: [`claim-${chainId}-1`],
    }
  }
}

export class DualChainProcessor {
  constructor(private generator: ChainGenerator = new DefaultChainGenerator()) {}

  async process(task: DualChainTask): Promise<DualChainResult> {
    const [chainA, chainB] = await Promise.all([
      this.generator.generate(task, 'chain-A'),
      this.generator.generate(task, 'chain-B'),
    ])

    return this.compareChains(chainA, chainB)
  }

  compareChains(chainA: ReasoningChain, chainB: ReasoningChain): DualChainResult {
    const contradictions = this._detectContradictions(chainA, chainB)

    if (contradictions.length > 0) {
      return {
        type: 'CONFLICT',
        conflict: {
          chain_a: chainA,
          chain_b: chainB,
          contradictions,
          requires_human_review: true,
        },
      }
    }

    const merged: MergedConclusion = {
      conclusion: chainA.conclusion, // Use chain A as primary when no conflict
      confidence: (chainA.confidence + chainB.confidence) / 2,
      supporting_chains: [chainA.chain_id, chainB.chain_id],
      merged_at: new Date().toISOString(),
    }

    return { type: 'MERGED', merged }
  }

  private _detectContradictions(chainA: ReasoningChain, chainB: ReasoningChain): string[] {
    const contradictions: string[] = []

    // Simple heuristic: if conclusions are significantly different
    if (chainA.conclusion !== chainB.conclusion) {
      // Check for explicit negation patterns
      const aLower = chainA.conclusion.toLowerCase()
      const bLower = chainB.conclusion.toLowerCase()

      const negationPairs = [
        ['increase', 'decrease'],
        ['approve', 'reject'],
        ['execute', 'block'],
        ['safe', 'unsafe'],
        ['recommended', 'not recommended'],
      ]

      for (const [pos, neg] of negationPairs) {
        if (
          (aLower.includes(pos) && bLower.includes(neg)) ||
          (aLower.includes(neg) && bLower.includes(pos))
        ) {
          contradictions.push(`Chain A says "${pos}" but Chain B says "${neg}"`)
        }
      }
    }

    return contradictions
  }
}
