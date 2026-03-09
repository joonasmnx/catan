'use client';

import { useEffect, useRef, useState } from 'react';
import type { CIBIScore } from '@/lib/types';

interface Props {
  cibi: CIBIScore | null;
  attempts: number;
  mode: string;
  layout: string;
  boardKey: number;
}

interface SubScore {
  key: keyof CIBIScore;
  label: string;
  weight: string;
  desc: string;
}

const SUB_SCORES: SubScore[] = [
  {
    key: 'pipBalance',
    label: 'Pip Balance',
    weight: '25%',
    desc: 'Every resource earns roughly equal dice odds across all its tiles.',
  },
  {
    key: 'intersectionQuality',
    label: 'Settlement Spots',
    weight: '30%',
    desc: 'Corners where three tiles meet offer resource variety and decent pip totals.',
  },
  {
    key: 'resourceClustering',
    label: 'Resource Spread',
    weight: '25%',
    desc: 'Same-type tiles are spread far apart — no corner monopolises one material.',
  },
  {
    key: 'redNumberSpread',
    label: '6 & 8 Spread',
    weight: '15%',
    desc: 'The most-rolled numbers are well separated so multiple players benefit.',
  },
  {
    key: 'desertPlacement',
    label: 'Desert Position',
    weight: '5%',
    desc: 'The barren desert sits toward the edge, wasting as few good spots as possible.',
  },
];

function barColor(v: number): string {
  if (v >= 75) return '#22c55e';
  if (v >= 50) return '#f59e0b';
  return '#ef4444';
}

function verdictLabel(score: number): { text: string; bg: string; color: string } {
  if (score >= 85) return { text: 'Exceptional', bg: 'rgba(34,197,94,0.14)', color: '#22c55e' };
  if (score >= 70) return { text: 'Excellent', bg: 'rgba(34,197,94,0.10)', color: '#4ade80' };
  if (score >= 55) return { text: 'Decent', bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' };
  return { text: 'Try again', bg: 'rgba(239,68,68,0.12)', color: '#f87171' };
}

function modeLabel(mode: string): string {
  return mode
    .replace('standard', 'Standard ')
    .replace('seafarers', 'Seafarers ')
    .replace('4', '4P')
    .replace('56', '5–6P');
}

function layoutLabel(layout: string): string {
  if (layout === 'classic') return 'Classic Island';
  if (layout === 'archipelago') return 'Archipelago';
  return 'Twin Islands';
}

/** Animated count-up from 0 to target over ~800ms */
function useCountUp(target: number | null, boardKey: number): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (target === null) { setDisplay(0); return; }
    const finalTarget = target;
    const start = performance.now();
    const duration = 750;
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(finalTarget * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, boardKey]); // boardKey resets animation for same score re-generates

  return display;
}

export default function ScorePanel({ cibi, attempts, mode, layout, boardKey }: Props) {
  const totalScore = cibi?.total ?? null;
  const displayScore = useCountUp(totalScore, boardKey);
  const scoreCol = totalScore !== null ? barColor(totalScore) : 'var(--text-3)';
  const verdict = totalScore !== null ? verdictLabel(totalScore) : null;
  const isSeafarers = mode.includes('seafarers');

  if (!cibi) {
    return (
      <div style={{ padding: '12px 0' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
          Generate a board to see the CIBI balance score — it rates pip distribution, settlement spot quality, resource spread, and number placement.
        </p>
      </div>
    );
  }

  return (
    <div className="score-card">
      {/* Header */}
      <div className="score-card-header">
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          CIBI Score
        </span>
        {verdict && (
          <span className="score-verdict" style={{ background: verdict.bg, color: verdict.color }}>
            {verdict.text}
          </span>
        )}
      </div>

      {/* Big number */}
      <div className="score-total-block">
        <span className="score-total-num" style={{ color: scoreCol }}>
          {displayScore}
        </span>
        <span className="score-total-denom">/ 100</span>
      </div>

      {/* Sub-scores */}
      <div>
        {SUB_SCORES.map((s) => {
          const val = cibi[s.key] as number;
          const col = barColor(val);
          return (
            <div key={s.key} className="subscore-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 500 }}>{s.weight}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: col, minWidth: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${val}%`,
                    background: col,
                    boxShadow: `0 0 8px ${col}55`,
                  }}
                />
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.55, marginTop: 2 }}>{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Footer meta */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Mode</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600 }}>{modeLabel(mode)}</span>
        </div>
        {isSeafarers && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Layout</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600 }}>{layoutLabel(layout)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Attempts</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontWeight: 600 }}>{attempts.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
