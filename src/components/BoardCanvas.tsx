'use client';

import { useEffect, useRef } from 'react';
import type { Board } from '@/lib/types';
import { renderBoard } from '@/lib/renderer';

interface Props {
  board: Board | null;
}

export default function BoardCanvas({ board }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!board || !canvasRef.current) return;
    renderBoard(canvasRef.current, board);
  }, [board]);

  return (
    <div style={{
      background: '#08090f',
      border: '1px solid #2a2218',
      borderTop: '1px solid #3e3020',
      borderRadius: 12,
      padding: 12,
      boxShadow: '0 8px 48px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.5)',
      flexShrink: 0,
    }}>
      <canvas
        ref={canvasRef}
        width={620}
        height={620}
        style={{ display: 'block', borderRadius: 4 }}
      />
    </div>
  );
}
