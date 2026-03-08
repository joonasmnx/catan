'use client';

import { useState, useTransition } from 'react';
import type { Board, GameMode, LayoutType } from '@/lib/types';
import { generateBoard } from '@/lib/boardGenerator';
import { RESOURCE_COLORS, RESOURCE_LABELS } from '@/lib/types';
import BoardCanvas from '@/components/BoardCanvas';
import ScorePanel from '@/components/ScorePanel';

const LAND_RESOURCES = ['forest', 'pasture', 'fields', 'mountains', 'hills', 'desert'] as const;

export default function Home() {
  const [mode, setMode] = useState<GameMode>('standard4');
  const [layout, setLayout] = useState<LayoutType>('classic');
  const [board, setBoard] = useState<Board | null>(null);
  const [status, setStatus] = useState('Select a mode and click Generate.');
  const [isPending, startTransition] = useTransition();

  const isSeafarers = mode.includes('seafarers');

  function handleGenerate() {
    setStatus('Generating…');
    startTransition(() => {
      const b = generateBoard(mode, layout);
      setBoard(b);
      setStatus(`Board generated — CIBI score ${b.cibi.total}/100`);
    });
  }

  const selectStyle: React.CSSProperties = {
    background: '#16110c',
    color: '#e8d5a3',
    border: '1px solid #5a4030',
    borderRadius: 6,
    padding: '9px 14px',
    fontFamily: "'IM Fell English', serif",
    fontSize: '0.95rem',
    cursor: 'pointer',
  };

  return (
    <div className="page-outer" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 20px 48px',
      minHeight: '100vh',
    }}>

      {/* ── Header ── */}
      <header style={{ textAlign: 'center', marginBottom: 28 }}>
        {/* Easter egg — top centre */}
        <p style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: '0.88rem',
          color: '#6a5030',
          letterSpacing: 1,
          marginBottom: 10,
        }}>
          Ready to Ain?
        </p>

        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
          color: '#d4a843',
          textShadow: '0 2px 24px rgba(212,168,67,0.5), 0 0 60px rgba(212,168,67,0.15)',
          letterSpacing: 6,
          marginBottom: 8,
        }}>
          CATAN MAP GENERATOR
        </h1>

        <p style={{
          color: '#907040',
          fontStyle: 'italic',
          fontSize: '1rem',
          marginBottom: 14,
          letterSpacing: 0.5,
        }}>
          Balanced board generation with CIBI scoring
        </p>

        {/* Ornamental divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #5a3e1a, transparent)' }} />
          <div style={{ width: 7, height: 7, background: '#d4a843', transform: 'rotate(45deg)', boxShadow: '0 0 8px rgba(212,168,67,0.6)' }} />
          <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, #5a3e1a, transparent)' }} />
        </div>
      </header>

      {/* ── Controls ── */}
      <div className="controls-row" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        background: 'linear-gradient(160deg, #2a2016 0%, #1e1810 100%)',
        border: '1px solid #5a4020',
        borderTop: '1px solid #7a5828',
        borderRadius: 10,
        padding: '18px 28px',
        width: '100%',
        maxWidth: 900,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,80,0.06)',
      }}>
        <label className="controls-label" style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.8rem',
          color: '#a07840',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          Game Mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as GameMode)}
          className="controls-select"
          style={selectStyle}
        >
          <option value="standard4">Standard 4-Player (19 tiles)</option>
          <option value="standard56">Standard 5–6 Player (30 tiles)</option>
          <option value="seafarers4">Seafarers 4-Player (19 + water)</option>
          <option value="seafarers56">Seafarers 5–6 Player (30 + water)</option>
        </select>

        {isSeafarers && (
          <>
            <label className="controls-label" style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.8rem',
              color: '#a07840',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}>
              Map Layout
            </label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as LayoutType)}
              className="controls-select"
              style={selectStyle}
            >
              <option value="classic">Classic Island</option>
              <option value="archipelago">Archipelago (3 Islands)</option>
              <option value="twin">Twin Islands</option>
            </select>
          </>
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="controls-btn"
          style={{
            background: isPending
              ? 'linear-gradient(160deg, #7a6010, #9a8030, #6a5010)'
              : 'linear-gradient(160deg, #c49828 0%, #e8c050 40%, #b08020 100%)',
            color: '#1a1008',
            border: 'none',
            borderRadius: 7,
            padding: '11px 32px',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            letterSpacing: 2,
            cursor: isPending ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            boxShadow: '0 2px 12px rgba(180,140,20,0.35), inset 0 1px 0 rgba(255,255,200,0.25)',
            opacity: isPending ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {isPending ? 'Generating…' : 'Generate Board'}
        </button>
      </div>

      {/* Status */}
      <p style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '0.82rem',
        color: '#907040',
        marginBottom: 12,
        letterSpacing: 1,
        minHeight: 22,
        textAlign: 'center',
      }}>
        {status}
      </p>

      {/* ── Main content ── */}
      <div className="main-content" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        justifyContent: 'center',
        width: '100%',
        maxWidth: 1220,
      }}>
        <BoardCanvas board={board} />
        <ScorePanel
          cibi={board?.cibi ?? null}
          attempts={board?.attempts ?? 0}
          mode={mode}
          layout={isSeafarers ? layout : 'classic'}
        />
      </div>

      {/* ── Legend ── */}
      {board && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 18px',
          justifyContent: 'center',
          marginTop: 20,
          fontSize: '0.76rem',
          color: '#7a6030',
        }}>
          {LAND_RESOURCES.map((r) => {
            const col = RESOURCE_COLORS[r];
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 13,
                  height: 13,
                  borderRadius: 3,
                  background: col.mid,
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }} />
                {RESOURCE_LABELS[r]}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
