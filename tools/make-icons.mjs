// Genera icons/icon-180.png, icon-192.png, icon-512.png sin dependencias (Node + zlib).
// Uso: node tools/make-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons');
fs.mkdirSync(out, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (w, h, rgb) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bit, RGB
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
};

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const stops = [[255, 168, 51], [255, 74, 128], [123, 92, 255]];
const grad = (t) => (t < 0.5 ? mix(stops[0], stops[1], t * 2) : mix(stops[1], stops[2], (t - 0.5) * 2));

function starPoly(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return pts;
}
function inside(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function render(size) {
  const buf = Buffer.alloc(size * size * 3);
  const cx = size / 2, cy = size * 0.52;
  const R = size * 0.30, r = R * 0.48;
  const star = starPoly(cx, cy, R, r);
  const shadow = starPoly(cx, cy + size * 0.022, R, r);
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        let col = grad((px + py) / (2 * size));
        // brillo suave
        const d = Math.hypot(px - size * 0.3, py - size * 0.25) / size;
        col = mix(col, [255, 255, 255], Math.max(0, 0.25 - d * 0.5));
        if (inside(shadow, px, py)) col = mix(col, [90, 20, 80], 0.35);
        if (inside(star, px, py)) {
          col = mix([255, 214, 61], [255, 244, 160], Math.max(0, 1 - (py - (cy - R)) / (2 * R)));
        }
        acc = acc.map((v, i) => v + col[i]);
      }
      const o = (y * size + x) * 3;
      for (let i = 0; i < 3; i++) buf[o + i] = Math.round(acc[i] / (SS * SS));
    }
  }
  return png(size, size, buf);
}

for (const s of [180, 192, 512]) {
  fs.writeFileSync(path.join(out, `icon-${s}.png`), render(s));
  console.log('icon-' + s + '.png');
}
