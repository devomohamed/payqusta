const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

function toBarcodeText(value) {
  return String(value ?? '').trim();
}

function encodeCode128(value) {
  const text = toBarcodeText(value);
  if (!text) return null;

  const useCodeSetC = /^\d+$/.test(text) && text.length % 2 === 0;
  const codes = [useCodeSetC ? 105 : 104];

  if (useCodeSetC) {
    for (let index = 0; index < text.length; index += 2) {
      codes.push(Number(text.slice(index, index + 2)));
    }
  } else {
    for (const character of text) {
      const code = character.charCodeAt(0);
      if (code < 32 || code > 126) return null;
      codes.push(code - 32);
    }
  }

  const checksum = codes.reduce((sum, code, index) => {
    if (index === 0) return code;
    return sum + (code * index);
  }, 0) % 103;

  codes.push(checksum, 106);
  return codes;
}

function buildCode128Svg(value, options = {}) {
  const {
    height = 72,
    moduleWidth = 2,
    quietZone = 12,
    fontSize = 14,
    showText = true,
    textMargin = 16,
  } = options;
  const codes = encodeCode128(value);
  if (!codes) return '';

  let x = quietZone;
  const rects = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) return '';
    for (let index = 0; index < pattern.length; index += 1) {
      const width = Number(pattern[index]) * moduleWidth;
      if (index % 2 === 0) {
        rects.push(`<rect x="${x}" y="0" width="${width}" height="${height}" fill="#111827" />`);
      }
      x += width;
    }
  }

  const totalWidth = x + quietZone;
  const text = toBarcodeText(value);
  const textBlock = showText
    ? `<text x="${totalWidth / 2}" y="${height + textMargin}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fontSize}" fill="#111827">${text}</text>`
    : '';
  const totalHeight = showText ? height + textMargin + fontSize : height;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" role="img" aria-label="Barcode ${text}">
      <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
      ${rects.join('')}
      ${textBlock}
    </svg>
  `.trim();
}

function buildQrFallbackSvg(value, options = {}) {
  const text = toBarcodeText(value);
  if (!text) return '';
  const size = options.size || 180;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR fallback ${text}">
      <rect width="${size}" height="${size}" rx="12" fill="#ffffff" stroke="#111827" stroke-width="4" />
      <rect x="16" y="16" width="${size - 32}" height="${size - 32}" rx="10" fill="#f3f4f6" stroke="#111827" stroke-dasharray="6 6" />
      <text x="${size / 2}" y="${size / 2 - 8}" text-anchor="middle" font-family="ui-sans-serif, system-ui" font-size="18" font-weight="700" fill="#111827">QR CODE</text>
      <text x="${size / 2}" y="${size / 2 + 24}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#374151">${text.slice(0, 24)}</text>
    </svg>
  `.trim();
}

export function resolveBarcodePayload(source, preferredSource = 'local') {
  if (!source) return null;
  const pick = (kind) => {
    if (kind === 'local' && source.localBarcode) {
      return {
        value: source.localBarcode,
        type: source.localBarcodeType || 'CODE128',
        source: 'local',
      };
    }
    if (kind === 'international' && (source.internationalBarcode || source.barcode)) {
      return {
        value: source.internationalBarcode || source.barcode,
        type: source.internationalBarcodeType || 'UNKNOWN',
        source: 'international',
      };
    }
    return null;
  };

  return pick(preferredSource) || pick(preferredSource === 'local' ? 'international' : 'local');
}

export function buildBarcodeSvg(value, format = 'CODE128', options = {}) {
  const normalizedValue = toBarcodeText(value);
  if (!normalizedValue) return '';
  if (format === 'QR_CODE') return buildQrFallbackSvg(normalizedValue, options);
  return buildCode128Svg(normalizedValue, options);
}

export function downloadBarcodePng(svgMarkup, filename = 'barcode.png') {
  return new Promise((resolve, reject) => {
    if (!svgMarkup) {
      reject(new Error('Missing SVG markup'));
      return;
    }

    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width * 2;
      canvas.height = image.height * 2;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to export PNG'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Failed to load SVG image'));
    };

    image.src = svgUrl;
  });
}

export function printBarcodeLabel({ svgMarkup, title = 'Barcode Label', subtitle = '', caption = '' }) {
  if (!svgMarkup || typeof window === 'undefined') return;

  // Create a hidden iframe for printing to avoid popup blockers and about:blank issues
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const htmlContent = `
    <!doctype html>
    <html dir="rtl">
      <head>
        <title>${title}</title>
        <style>
          body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #fff; }
          .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
          .label { width: 100%; max-width: 320px; background: #fff; text-align: center; }
          h1 { margin: 0 0 6px; font-size: 18px; }
          p { margin: 0; color: #6b7280; font-size: 12px; }
          .svg { margin: 16px 0 10px; display: flex; justify-content: center; }
          .caption { margin-top: 10px; font-size: 14px; font-weight: 700; letter-spacing: .08em; color: #111827; }
          @media print {
            body { background: #fff; }
            .page { padding: 0; display: block; min-height: auto; }
            .label { max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="label">
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
            <div class="svg">${svgMarkup}</div>
            ${caption ? `<div class="caption">${caption}</div>` : ''}
          </div>
        </div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow || iframe.contentDocument.document || iframe.contentDocument;

  doc.document.open();
  doc.document.write(htmlContent);
  doc.document.close();

  // Wait a moment for the DOM to render inside the iframe before printing
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Failed to trigger print:', err);
    } finally {
      // Clean up the iframe after printing (with a delay so print dialog doesn't close prematurely on some browsers)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 300);
}

export function getBarcodeSearchText(product = {}) {
  return [
    product.barcode,
    product.internationalBarcode,
    product.localBarcode,
    product.sku,
    ...(Array.isArray(product.variants)
      ? product.variants.flatMap((variant) => [
        variant?.barcode,
        variant?.internationalBarcode,
        variant?.localBarcode,
        variant?.sku,
      ])
      : []),
  ]
    .filter(Boolean)
    .join(' ');
}
