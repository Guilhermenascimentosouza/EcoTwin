import React from 'react';

export default function ImpactChart({ data }) {
  const points = Array.isArray(data) ? data : [];

  const values = points.map((p) => Number(p?.impact ?? 0));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  const w = 100;
  const h = 100;
  const padX = 6;
  const padY = 8;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const toX = (i) => (points.length <= 1 ? w / 2 : padX + (i / (points.length - 1)) * innerW);
  const toY = (v) => padY + (1 - (v - min) / range) * innerH;

  const d = points
    .map((p, i) => {
      const x = toX(i);
      const y = toY(Number(p?.impact ?? 0));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="h-48">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <path d={`M ${padX} ${padY + innerH}`} stroke="rgba(120,113,108,0.25)" strokeWidth="1" fill="none" />
        <path d={`M ${padX} ${padY} V ${padY + innerH}`} stroke="rgba(120,113,108,0.25)" strokeWidth="1" fill="none" />
        {points.length > 0 && (
          <>
            <path d={d} stroke="#16a34a" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}
