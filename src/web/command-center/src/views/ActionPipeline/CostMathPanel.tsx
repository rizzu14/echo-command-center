import { useState } from 'react';
import type { Action } from '../../types';

interface CostMathPanelProps {
  action: Action;
}

export function CostMathPanel({ action }: CostMathPanelProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const { costMath } = action;

  return (
    <div
      style={{
        padding: 'var(--space-4) var(--space-6)',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Math formula */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
            Cost Math
          </div>
          <div
            style={{
              fontFamily: 'SF Mono, Fira Code, monospace',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-background-secondary)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Savings = ({' '}
            <span style={{ color: 'var(--color-accent-red)' }}>${costMath.currentCostUsd.toFixed(2)}</span>
            {' '}−{' '}
            <span style={{ color: 'var(--color-accent-green)' }}>${costMath.optimizedCostUsd.toFixed(2)}</span>
            {' '}) × {costMath.hoursPerMonth} hrs/month
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-accent-red)' }}>
                ${costMath.currentCostUsd.toFixed(2)}/hr
              </div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--color-text-muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>→</div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optimized</div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-accent-green)' }}>
                ${costMath.optimizedCostUsd.toFixed(2)}/hr
              </div>
            </div>
          </div>
        </div>

        {/* Projected savings */}
        <div style={{ textAlign: 'center', minWidth: 160 }}>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
            Projected Monthly Savings
          </div>
          <div style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, color: 'var(--color-accent-green)', lineHeight: 1 }}>
            ${costMath.projectedMonthlySavings.toLocaleString()}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
            ${(costMath.projectedMonthlySavings * 12).toLocaleString()}/year
          </div>
        </div>

        {/* Reasoning */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowReasoning(!showReasoning)}
            style={{ marginBottom: 'var(--space-2)' }}
          >
            {showReasoning ? '▲' : '▼'} Why this action?
          </button>
          {showReasoning && action.reasoning && (
            <div
              style={{
                padding: 'var(--space-3)',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {action.reasoning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
