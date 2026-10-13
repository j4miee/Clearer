import { formatBytes } from './storage';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderRecapPng(recap) {
  await document.fonts?.ready;
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0E1314';
  ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, col) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(14,19,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  glow(900, 160, 520, 'rgba(255,90,54,0.55)');
  glow(120, 1150, 520, 'rgba(255,201,60,0.35)');

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < W; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const mono = (s, w = 400) => `${w} ${s}px "JetBrains Mono", monospace`;
  const grot = (s, w = 700) => `${w} ${s}px "Hanken Grotesk", sans-serif`;

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = mono(28, 500);
  ctx.fillText('CLEARSPACE / WEEKLY RECAP', 80, 120);
  ctx.fillText(recap.range.toUpperCase(), 80, 162);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = grot(200, 700);
  ctx.fillText(formatBytes(recap.bytes), 72, 400);
  ctx.font = grot(52, 500);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('reclaimed this week', 80, 470);

  // bars
  const bx = 80, by = 560, bw = W - 160, bh = 240;
  roundRect(ctx, bx, by, bw, bh + 70, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
  const colW = (bw - 80) / 7;
  recap.days.forEach((d, i) => {
    const h = Math.max(8, (d.bytes / recap.maxBytes) * (bh - 40));
    const x = bx + 40 + i * colW + colW * 0.2;
    roundRect(ctx, x, by + bh - h, colW * 0.6, h, 8);
    ctx.fillStyle = d.bytes ? '#FF5A36' : 'rgba(255,255,255,0.15)'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = mono(24, 500);
    ctx.fillText(d.label, x + colW * 0.3 - 7, by + bh + 45);
  });

  const tiles = [
    ['PHOTOS CLEARED', String(recap.cleared)],
    ['BEST STREAK', `${recap.bestStreak}d`],
    ['TOP TROPHY', recap.topTrophy ? recap.topTrophy.title : '—'],
  ];
  const tw = (W - 160 - 40) / 3;
  tiles.forEach(([label, value], i) => {
    const x = 80 + i * (tw + 20), y = 920;
    roundRect(ctx, x, y, tw, 220, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = mono(20, 500);
    ctx.fillText(label, x + 26, y + 50);
    ctx.fillStyle = i === 2 ? '#FFC93C' : '#FFFFFF';
    ctx.font = grot(value.length > 9 ? 40 : 72, 700);
    ctx.fillText(value, x + 24, y + 160, tw - 48);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = mono(24, 400);
  ctx.fillText('Keep the moments. Clear the rest.', 80, H - 90);

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

export async function shareRecap(recap) {
  const blob = await renderRecapPng(recap);
  const file = new File([blob], 'clearspace-weekly-recap.png', { type: 'image/png' });
  const text = `I reclaimed ${formatBytes(recap.bytes)} this week with Clearspace — ${recap.cleared} photos cleared, ${recap.bestStreak}-day best streak.`;
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'My Clearspace week', text });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
