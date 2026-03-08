import React, { useMemo } from 'react';
import { buildBarcodeSvg } from '../utils/barcodeUtils';

export default function BarcodeLabel({
  value,
  format = 'CODE128',
  title = '',
  subtitle = '',
  caption = '',
  className = '',
  compact = false,
}) {
  const svgMarkup = useMemo(() => buildBarcodeSvg(value, format, {
    height: compact ? 54 : 72,
    moduleWidth: compact ? 1.8 : 2,
    fontSize: compact ? 12 : 14,
    size: compact ? 140 : 180,
  }), [compact, format, value]);

  if (!value) {
    return (
      <div className={`rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 ${className}`}>
        لا يوجد باركود لعرضه
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {title ? <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{title}</p> : null}
      {subtitle ? <p className="mt-1 text-sm font-bold text-gray-800">{subtitle}</p> : null}
      <div className="mt-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      {caption ? <p className="mt-2 text-xs font-semibold text-gray-500">{caption}</p> : null}
    </div>
  );
}
