/* Increase the visible EzerMate favicon mark within the browser-managed tab-icon area.
   Tab icon slots have browser-defined dimensions; we crop the logo's internal whitespace. */
(() => {
  'use strict';
  const icon = document.querySelector('link[rel="icon"]');
  if (!icon || !document.createElement('canvas').getContext) return;

  const source = new Image();
  source.onload = () => {
    try {
      const maximum = 320;
      const factor = Math.min(1, maximum / Math.max(source.naturalWidth, source.naturalHeight));
      const w = Math.max(1, Math.round(source.naturalWidth * factor));
      const h = Math.max(1, Math.round(source.naturalHeight * factor));
      const scan = document.createElement('canvas');
      scan.width = w;
      scan.height = h;
      const scanContext = scan.getContext('2d', { willReadFrequently: true });
      if (!scanContext) return;
      scanContext.drawImage(source, 0, 0, w, h);
      const pixels = scanContext.getImageData(0, 0, w, h).data;
      const cornerIndices = [0, (w - 1) * 4, ((h - 1) * w) * 4, (w * h - 1) * 4];
      const corners = cornerIndices.map(index => [
        pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]
      ]);
      const background = [0, 1, 2, 3].map(channel =>
        Math.round(corners.reduce((sum, corner) => sum + corner[channel], 0) / 4)
      );
      const hasTransparentBackground = background[3] < 40;
      let left = w, top = h, right = -1, bottom = -1;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const index = (y * w + x) * 4;
          const alpha = pixels[index + 3];
          if (alpha < 48) continue;
          const difference = Math.max(
            Math.abs(pixels[index] - background[0]),
            Math.abs(pixels[index + 1] - background[1]),
            Math.abs(pixels[index + 2] - background[2])
          );
          if (!hasTransparentBackground && difference < 38) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      if (right <= left || bottom <= top) return;
      const markW = right - left + 1;
      const markH = bottom - top + 1;
      const pad = Math.max(2, Math.round(Math.max(markW, markH) * 0.055));
      const x = Math.max(0, left - pad), y = Math.max(0, top - pad);
      const cropW = Math.min(w - x, markW + 2 * pad);
      const cropH = Math.min(h - y, markH + 2 * pad);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const out = canvas.getContext('2d');
      if (!out) return;
      const size = Math.max(cropW, cropH);
      if (!hasTransparentBackground) {
        out.fillStyle = 'rgb(' + background.slice(0, 3).join(',') + ')';
        out.fillRect(0, 0, 128, 128);
      }
      const dx = (128 - cropW * 128 / size) / 2;
      const dy = (128 - cropH * 128 / size) / 2;
      out.drawImage(scan, x, y, cropW, cropH,
        dx, dy, cropW * 128 / size, cropH * 128 / size);
      icon.href = canvas.toDataURL('image/png');
    } catch {
      // The unmodified logo remains the favicon if canvas processing is unavailable.
    }
  };
  source.src = '/ezermate-logo.png?v=20261122c';
})();
