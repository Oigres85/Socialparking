/**
 * @fileOverview Genera una "card" 1080x1920 (formato Storie Instagram/WhatsApp/TikTok) con le statistiche
 * dell'utente e il suo codice invito. Le immagini condivise convertono molto più di un semplice link.
 */

export interface ShareCardData {
  headline: string;      // es. "Ho liberato 12 parcheggi"
  subline: string;       // es. "≈ 96 minuti regalati ad altri automobilisti"
  levelLabel: string;    // es. "👑 Re del Parcheggio"
  inviteLabel: string;   // es. "Usa il mio codice"
  inviteCode: string;
  footer: string;        // es. "siigep.tech"
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderShareCard(d: ShareCardData): string {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = (weight: number, size: number) => `${weight} ${size}px Inter, -apple-system, system-ui, sans-serif`;

  // Sfondo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#020617');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(200, 300, 700, 'rgba(37,99,235,0.35)');
  glow(900, 1700, 700, 'rgba(249,115,22,0.25)');

  // Logo
  ctx.save();
  ctx.shadowColor = 'rgba(37,99,235,0.6)';
  ctx.shadowBlur = 80;
  roundRect(ctx, W / 2 - 130, 260, 260, 260, 70);
  ctx.fillStyle = '#2563eb';
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = font(900, 200);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', W / 2, 400);

  ctx.font = font(900, 56);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('SOCIAL PARKING', W / 2, 620);

  // Headline
  ctx.fillStyle = '#fff';
  ctx.font = font(900, 110);
  let y = 820;
  for (const line of wrap(ctx, d.headline, W - 160)) {
    ctx.fillText(line, W / 2, y);
    y += 120;
  }

  ctx.font = font(700, 48);
  ctx.fillStyle = '#fb923c';
  for (const line of wrap(ctx, d.subline, W - 200)) {
    ctx.fillText(line, W / 2, y + 20);
    y += 60;
  }

  // Livello
  ctx.font = font(900, 54);
  const lvlW = ctx.measureText(d.levelLabel).width + 100;
  roundRect(ctx, W / 2 - lvlW / 2, y + 80, lvlW, 110, 55);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillText(d.levelLabel, W / 2, y + 137);

  // Codice invito
  const boxY = 1420;
  roundRect(ctx, 120, boxY, W - 240, 300, 60);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = font(900, 40);
  ctx.fillText(d.inviteLabel.toUpperCase(), W / 2, boxY + 80);
  ctx.fillStyle = '#000';
  ctx.font = font(900, 130);
  ctx.fillText(d.inviteCode.split('').join(' '), W / 2, boxY + 190);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = font(800, 44);
  ctx.fillText(d.footer, W / 2, 1810);

  return canvas.toDataURL('image/png');
}
