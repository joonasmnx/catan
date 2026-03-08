'use client';

import type { CIBIScore } from '@/lib/types';

interface Props {
  cibi: CIBIScore | null;
  attempts: number;
  mode: string;
  layout: string;
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
    weight: '30%',
    desc: 'Every resource earns roughly equal dice odds. No single material dominates income.',
  },
  {
    key: 'intersectionQuality',
    label: 'Settlement Spots',
    weight: '30%',
    desc: 'Each corner where three tiles meet offers variety. Strong spots blend three resources with decent numbers.',
  },
  {
    key: 'resourceClustering',
    label: 'Resource Spread',
    weight: '20%',
    desc: 'Same-type tiles are placed far apart. No corner of the board monopolises one material.',
  },
  {
    key: 'redNumberSpread',
    label: '6 & 8 Spread',
    weight: '10%',
    desc: 'The most-rolled numbers are well separated. Multiple players benefit from high-frequency tiles.',
  },
  {
    key: 'desertPlacement',
    label: 'Desert Position',
    weight: '10%',
    desc: 'The barren desert sits toward the edge. The dead tile wastes as few valuable settlement spots as possible.',
  },
];

function scoreColor(v: number): string {
  if (v >= 75) return '#5ecf62';
  if (v >= 55) return '#ffaa20';
  return '#f45050';
}

function BarFill({ value }: { value: number }) {
  const color = scoreColor(value);
  const gradMap: Record<string, string> = {
    '#5ecf62': 'linear-gradient(90deg, #1a5c1e, #5ecf62)',
    '#ffaa20': 'linear-gradient(90deg, #8a4800, #ffaa20)',
    '#f45050': 'linear-gradient(90deg, #7a1010, #f45050)',
  };
  return (
    <div style={{
      background: '#1a1408',
      borderRadius: 4,
      height: 7,
      overflow: 'hidden',
      marginBottom: 5,
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        height: '100%',
        width: `${value}%`,
        borderRadius: 4,
        background: gradMap[color] || gradMap['#ffaa20'],
        transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
        boxShadow: `0 0 6px ${color}66`,
      }} />
    </div>
  );
}

export default function ScorePanel({ cibi, attempts, mode, layout }: Props) {
  const totalScore = cibi?.total ?? null;
  const scoreCol = totalScore !== null ? scoreColor(totalScore) : '#7a6030';

  const modeLabel = mode.replace('standard', 'Standard ').replace('seafarers', 'Seafarers ')
    .replace('4', '4-player').replace('56', '5–6 player');
  const layoutLabel = layout === 'classic' ? 'Classic Island' : layout === 'archipelago' ? 'Archipelago' : 'Twin Islands';

  return (
    <div className="score-panel" style={{
      background: 'linear-gradient(170deg, #201a10 0%, #181410 100%)',
      border: '1px solid #4a3818',
      borderTop: '1px solid #6a5025',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2a1e08, #3a2a10, #2a1e08)',
        borderBottom: '1px solid #5a4018',
        padding: '16px 20px 14px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          color: '#d4a843',
          fontSize: '1rem',
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          CIBI Balance Score
        </h2>
      </div>

      <div style={{ padding: 20 }}>
        {/* Big score */}
        <div style={{
          textAlign: 'center',
          marginBottom: 6,
          paddingBottom: 16,
          borderBottom: '1px solid #2e2410',
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '3.6rem',
            fontWeight: 700,
            lineHeight: 1,
            color: scoreCol,
            textShadow: `0 0 30px ${scoreCol}`,
          }}>
            {totalScore !== null ? totalScore : '—'}
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: '#7a6030',
            textTransform: 'uppercase',
            letterSpacing: 2.5,
            marginTop: 2,
          }}>
            / 100 · CIBI Index
          </div>
        </div>

        {/* CIBI description */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid #2e2410',
          borderRadius: 6,
          padding: '10px 12px',
          margin: '14px 0',
          fontSize: '0.78rem',
          color: '#907050',
          lineHeight: 1.65,
        }}>
          <strong style={{ color: '#b08840' }}>CIBI</strong> (Catan Intersection Balance Index) rates board fairness. <strong style={{ color: '#b08840' }}>70–84 is a good board</strong>, 85+ is exceptional. It checks pip balance across all resources, settlement spot variety, and that 6s &amp; 8s aren&apos;t clustered. Same resource types are never directly adjacent.
        </div>

        {/* Sub-scores */}
        {cibi ? (
          <div>
            {SUB_SCORES.map((s, idx) => {
              const val = cibi[s.key] as number;
              const col = scoreColor(val);
              return (
                <div key={s.key} style={{ marginBottom: idx < SUB_SCORES.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                    <span>
                      <span style={{ fontSize: '0.82rem', color: '#c4a060', fontFamily: "'Cinzel', serif", letterSpacing: 0.5 }}>{s.label}</span>
                      <span style={{ fontFamily: "'IM Fell English', serif", fontSize: '0.72rem', color: '#5a4020', fontStyle: 'italic', marginLeft: 4 }}>{s.weight}</span>
                    </span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', fontWeight: 700, color: col, minWidth: 28, textAlign: 'right' }}>{val}</span>
                  </div>
                  <BarFill value={val} />
                  <p style={{ fontSize: '0.80rem', color: '#6a5535', lineHeight: 1.55, fontStyle: 'italic' }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#7a6030', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
            Generate a board to see scores.
          </p>
        )}

        {cibi && (
          <>
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #3a2c14, transparent)', margin: '16px 0' }} />
            <div style={{ fontSize: '0.78rem', color: '#7a6030', lineHeight: 1.75 }}>
              <div>Mode <span style={{ color: '#b08840', fontWeight: 'bold' }}>{modeLabel}</span></div>
              {layout !== 'classic' && (
                <div>Layout <span style={{ color: '#b08840', fontWeight: 'bold' }}>{layoutLabel}</span></div>
              )}
              <div>Attempts <span style={{ color: '#b08840', fontWeight: 'bold' }}>{attempts.toLocaleString()}</span></div>
              <div>Verdict <span style={{ color: totalScore! >= 70 ? '#5ecf62' : totalScore! >= 45 ? '#ffaa20' : '#f45050', fontWeight: 'bold' }}>
                {totalScore! >= 85 ? 'Exceptional board' : totalScore! >= 70 ? 'Excellent board' : totalScore! >= 55 ? 'Decent board' : 'Try again'}
              </span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
