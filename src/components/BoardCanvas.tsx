'use client';

import { useEffect, useRef } from 'react';
import type { Board } from '@/lib/types';
import { renderBoard } from '@/lib/renderer';

interface Props {
  board: Board | null;
  boardKey: number;
}

export default function BoardCanvas({ board, boardKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!board || !canvasRef.current) return;
    renderBoard(canvasRef.current, board);
  }, [board]);

  return (
    // key forces remount on each new board → triggers board-animate CSS
    <div key={boardKey} className="board-canvas-wrap board-animate">
      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        className="board-canvas"
      />
    </div>
  );
}
