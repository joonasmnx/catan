'use client';

import { useState, useTransition } from 'react';
import type { Board, GameMode, LayoutType } from '@/lib/types';
import { generateBoard } from '@/lib/boardGenerator';
import { RESOURCE_COLORS, RESOURCE_LABELS } from '@/lib/types';
import BoardCanvas from '@/components/BoardCanvas';
import ScorePanel from '@/components/ScorePanel';

const LAND_RESOURCES = ['forest', 'pasture', 'fields', 'mountains', 'hills', 'desert'] as const;

type PlayerCount = '4' | '56';
type ModeType = 'standard' | 'seafarers';

const LAYOUTS: { value: LayoutType; label: string }[] = [
  { value: 'classic', label: 'Classic Island' },
  { value: 'archipelago', label: 'Archipelago (3 islands)' },
  { value: 'twin', label: 'Twin Islands' },
];

export default function Home() {
  const [players, setPlayers] = useState<PlayerCount>('4');
  const [modeType, setModeType] = useState<ModeType>('standard');
  const [layout, setLayout] = useState<LayoutType>('classic');
  const [board, setBoard] = useState<Board | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [status, setStatus] = useState('');
  const [genError, setGenError] = useState('');
  const [isPending, startTransition] = useTransition();

  const mode: GameMode = `${modeType}${players === '56' ? '56' : '4'}` as GameMode;
  const isSeafarers = modeType === 'seafarers';

  function handleGenerate() {
    setStatus('Generating…');
    setGenError('');
    startTransition(() => {
      try {
        const b = generateBoard(mode, layout);
        setBoard(b);
        setBoardKey(k => k + 1);
        setStatus(`${b.attempts.toLocaleString()} attempts evaluated`);
        setGenError('');
      } catch (err) {
        console.error('Board generation failed:', err);
        setGenError('Generation failed — please try again');
        setStatus('');
      }
    });
  }

  return (
    <div className="app-shell">

      {/* ── Left sidebar: controls ── */}
      <aside className="sidebar">
        {/* Title */}
        <div>
          <p style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
            Settle Catan
          </p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            Catan Map<br />Generator
          </h1>
          <p style={{ fontSize: '0.73rem', color: 'var(--text-2)', marginTop: 7, lineHeight: 1.6 }}>
            Balanced board generation<br />with CIBI scoring
          </p>
        </div>

        {/* Players pill */}
        <div>
          <span className="section-label">Players</span>
          <div className="pill-group">
            {(['4', '56'] as PlayerCount[]).map(p => (
              <button
                key={p}
                className={`pill-btn${players === p ? ' active' : ''}`}
                onClick={() => setPlayers(p)}
              >
                {p === '4' ? '4 Player' : '5–6 Player'}
              </button>
            ))}
          </div>
        </div>

        {/* Expansion pill */}
        <div>
          <span className="section-label">Expansion</span>
          <div className="pill-group">
            <button className={`pill-btn${modeType === 'standard' ? ' active' : ''}`} onClick={() => setModeType('standard')}>
              Standard
            </button>
            <button className={`pill-btn${modeType === 'seafarers' ? ' active' : ''}`} onClick={() => setModeType('seafarers')}>
              Seafarers
            </button>
          </div>
        </div>

        {/* Map layout (Seafarers only) */}
        {isSeafarers && (
          <div>
            <span className="section-label">Map Layout</span>
            <div className="pill-group vertical">
              {LAYOUTS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`pill-btn${layout === value ? ' active' : ''}`}
                  onClick={() => setLayout(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate button row */}
        <div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className={`btn-generate${isPending ? ' pending' : ''}`}
            >
              {isPending ? 'Generating' : 'Generate Board'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isPending || !board}
              className="btn-regen"
              title="Regenerate"
              aria-label="Regenerate board"
            >
              ↺
            </button>
          </div>
          {status && !genError && <p className="status-text" style={{ marginTop: 8 }}>{status}</p>}
          {genError && <p className="status-text" style={{ marginTop: 8, color: 'var(--red)' }}>{genError}</p>}
        </div>
      </aside>

      {/* ── Score area (below controls on desktop, after board on mobile) ── */}
      <div className="score-area">
        <ScorePanel
          cibi={board?.cibi ?? null}
          attempts={board?.attempts ?? 0}
          mode={mode}
          layout={isSeafarers ? layout : 'classic'}
          boardKey={boardKey}
        />
      </div>

      {/* ── Board area ── */}
      <main className="board-area">
        <div style={{ width: '100%', maxWidth: 660 }}>
          {board ? (
            <>
              <BoardCanvas board={board} boardKey={boardKey} />
              <div className="legend">
                {LAND_RESOURCES.map((r) => (
                  <div key={r} className="legend-item">
                    <div className="legend-dot" style={{ background: RESOURCE_COLORS[r].mid }} />
                    {RESOURCE_LABELS[r]}
                  </div>
                ))}
              </div>
              <div className="legend" style={{ marginTop: 6 }}>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#c8861c', border: '1.5px solid #7a4a08' }} />
                  ⚓ 3:1 Port
                </div>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#177040', border: '1.5px solid #0e4a28' }} />
                  🌲 2:1 Forest
                </div>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#54a808', border: '1.5px solid #3a7000' }} />
                  🐑 2:1 Pasture
                </div>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#d4a010', border: '1.5px solid #906800' }} />
                  🌾 2:1 Fields
                </div>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#607898', border: '1.5px solid #3a5068' }} />
                  ⛰ 2:1 Mountains
                </div>
                <div className="legend-item" style={{ opacity: 0.7, fontSize: '0.68rem' }}>
                  <div className="legend-dot" style={{ background: '#c84020', border: '1.5px solid #882010' }} />
                  🧱 2:1 Hills
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 4L60 20V44L32 60L4 44V20L32 4Z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                <path d="M32 18L46 26V42L32 50L18 42V26L32 18Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.2" />
              </svg>
              <div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>No board yet</p>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Configure your settings and<br />click Generate Board to begin
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
