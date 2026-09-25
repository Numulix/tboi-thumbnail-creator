import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25]; // 6 = RGBA, 2 = RGB
  const channels = colorType === 2 ? 3 : 4;
  let offset = 8;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(buf.subarray(offset + 8, offset + 8 + len));
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels + 1;
  const rawPixels = Buffer.alloc(w * h * channels);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * stride];
    for (let x = 0; x < w * channels; x++) {
      let val = raw[y * stride + 1 + x];
      const a = x >= channels ? rawPixels[y * w * channels + x - channels] : 0;
      const b = y > 0 ? rawPixels[(y - 1) * w * channels + x] : 0;
      const c =
        x >= channels && y > 0
          ? rawPixels[(y - 1) * w * channels + x - channels]
          : 0;
      if (filter === 1) val = (val + a) & 255;
      else if (filter === 2) val = (val + b) & 255;
      else if (filter === 3) val = (val + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        val = (val + pr) & 255;
      }
      rawPixels[y * w * channels + x] = val;
    }
  }
  if (channels === 4) {
    return { w, h, pixels: rawPixels };
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = rawPixels[i * 3];
    rgba[i * 4 + 1] = rawPixels[i * 3 + 1];
    rgba[i * 4 + 2] = rawPixels[i * 3 + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { w, h, pixels: rgba };
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(w, h, pixels) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function stitchRoomFromQuadrants(
  src,
  qRow = 0,
  singleCol = null,
  cropW = 234,
  cropH = 156
) {
  const outW = 468;
  const outH = 312;
  const out = Buffer.alloc(outW * outH * 4);
  // Fill canvas with opaque black for any outer margin (e.g. Cathedral's 12px outer border)
  for (let i = 0; i < outW * outH; i++) {
    out[i * 4 + 3] = 255;
  }

  const baseY = qRow * 156;
  const leftColX = singleCol !== null ? singleCol * 234 : 0;
  const rightColX = singleCol !== null ? singleCol * 234 : 234;
  const padX = 234 - cropW;
  const padY = 156 - cropH;

  const blendPixel = (baseSx, baseSy, overSx, overSy, dx, dy) => {
    const bi = (baseSy * src.w + baseSx) * 4;
    const oi = (overSy * src.w + overSx) * 4;
    const di = (dy * outW + dx) * 4;

    const oa = src.pixels[oi + 3] / 255;
    if (oa >= 0.999) {
      out[di] = src.pixels[oi];
      out[di + 1] = src.pixels[oi + 1];
      out[di + 2] = src.pixels[oi + 2];
      out[di + 3] = 255;
    } else if (oa <= 0.001) {
      out[di] = src.pixels[bi];
      out[di + 1] = src.pixels[bi + 1];
      out[di + 2] = src.pixels[bi + 2];
      out[di + 3] = 255;
    } else {
      out[di] = Math.round(src.pixels[oi] * oa + src.pixels[bi] * (1 - oa));
      out[di + 1] = Math.round(
        src.pixels[oi + 1] * oa + src.pixels[bi + 1] * (1 - oa)
      );
      out[di + 2] = Math.round(
        src.pixels[oi + 2] * oa + src.pixels[bi + 2] * (1 - oa)
      );
      out[di + 3] = 255;
    }
  };
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const mx = cropW - 1 - x;
      const my = cropH - 1 - y;
      // TL (shifted inward by padX, padY so inner floor meets at 234, 156)
      blendPixel(x, y, leftColX + x, baseY + y, padX + x, padY + y);
      // TR (flipped H)
      blendPixel(mx, y, rightColX + mx, baseY + y, 234 + x, padY + y);
      // BL (flipped V)
      blendPixel(x, my, leftColX + x, baseY + my, padX + x, 156 + y);
      // BR (flipped H+V)
      blendPixel(mx, my, rightColX + mx, baseY + my, 234 + x, 156 + y);
    }
  }
  return out;
}

function buildPlanetariumRoom() {
  const nebula = decodePng('raw-assets/gfx/backdrop/planetarium_blue_base.png');
  const glass = decodePng('raw-assets/gfx/backdrop/planetarium.png');
  const outW = 468;
  const outH = 312;
  const out = Buffer.alloc(outW * outH * 4);

  // Fill entire 468x312 canvas with starry nebula backdrop (centered crop from 600x400)
  const nebOffX = Math.floor((nebula.w - outW) / 2);
  const nebOffY = Math.floor((nebula.h - outH) / 2);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const ni = ((y + nebOffY) * nebula.w + (x + nebOffX)) * 4;
      const di = (y * outW + x) * 4;
      out[di] = nebula.pixels[ni];
      out[di + 1] = nebula.pixels[ni + 1];
      out[di + 2] = nebula.pixels[ni + 2];
      out[di + 3] = 255;
    }
  }

  // Alpha-blend planetarium floor & frame (442x286 centered at offset 13, 13) without surrounding stone walls
  for (let y = 0; y < glass.h; y++) {
    for (let x = 0; x < glass.w; x++) {
      const gi = (y * glass.w + x) * 4;
      const alpha = glass.pixels[gi + 3] / 255;
      if (alpha <= 0) continue;
      const dx = x + 13;
      const dy = y + 13;
      const di = (dy * outW + dx) * 4;
      out[di] = Math.round(glass.pixels[gi] * alpha + out[di] * (1 - alpha));
      out[di + 1] = Math.round(
        glass.pixels[gi + 1] * alpha + out[di + 1] * (1 - alpha)
      );
      out[di + 2] = Math.round(
        glass.pixels[gi + 2] * alpha + out[di + 2] * (1 - alpha)
      );
      out[di + 3] = 255;
    }
  }

  return out;
}

const ROOM_JOBS = [
  { id: 'basement', src: '01_basement.png', row: 0 },
  { id: 'cellar', src: '02_cellar.png', row: 0 },
  { id: 'burning-basement', src: '13_the burning basement.png', row: 0 },
  { id: 'caves', src: '03_caves.png', row: 0 },
  { id: 'catacombs', src: '04_catacombs.png', row: 0 },
  { id: 'flooded-caves', src: '14_the drowned caves.png', row: 0 },
  { id: 'depths', src: '05_depths.png', row: 0 },
  { id: 'necropolis', src: '06_necropolis.png', row: 0 },
  { id: 'dank-depths', src: '15_the dank depths.png', row: 0 },
  { id: 'womb', src: '07_the womb.png', row: 0 },
  { id: 'utero', src: '08_utero.png', row: 0 },
  { id: 'scarred-womb', src: '16_the scarred womb.png', row: 0 },
  { id: 'blue-womb', src: '18_blue womb.png', row: 0 },
  { id: 'sheol', src: '09_sheol.png', row: 0 },
  { id: 'cathedral', src: '10_cathedral.png', row: 0, cropW: 222, cropH: 144 },
  { id: 'chest', src: '11_chest.png', row: 0 },
  { id: 'dark-room', src: '12_darkroom.png', row: 0 },
  { id: 'home', src: '0ex_isaacs_bedroom.png', row: 0 },
  { id: 'downpour', src: '01x_downpour.png', row: 0 },
  { id: 'dross', src: '02x_dross.png', row: 0, col: 1 },
  { id: 'mines', src: '03x_mines.png', row: 0 },
  { id: 'ashpit', src: '04x_ashpit.png', row: 0 },
  { id: 'mausoleum', src: '05x_mausoleum.png', row: 1 },
  { id: 'gehenna', src: '06x_gehenna.png', row: 0 },
  { id: 'corpse', src: '07x_corpse.png', row: 0 },
  { id: 'shop-room', src: '0b_shop.png', row: 0 },
  { id: 'library', src: '0a_library.png', row: 0 },
  { id: 'secret-room', src: '0f_secretroom.png', row: 0 },
  { id: 'arcade', src: '0e_arcade.png', row: 0 },
  { id: 'sacrifice-room', src: '0g_sacrificeroom.png', row: 0 },
  { id: 'dice-room', src: '0e_diceroom.png', row: 0 },
];

const outDir = path.resolve('public/assets/rooms');
fs.mkdirSync(outDir, { recursive: true });

for (const job of ROOM_JOBS) {
  const srcPath = path.resolve('raw-assets/gfx/backdrop', job.src);
  const decoded = decodePng(srcPath);
  const stitched = stitchRoomFromQuadrants(
    decoded,
    job.row,
    job.col ?? null,
    job.cropW ?? 234,
    job.cropH ?? 156
  );
  fs.writeFileSync(
    path.join(outDir, `${job.id}.png`),
    encodePng(468, 312, stitched)
  );
}

// Planetarium special composite
const planetariumPixels = buildPlanetariumRoom();
fs.writeFileSync(
  path.join(outDir, 'planetarium.png'),
  encodePng(468, 312, planetariumPixels)
);

console.log(`Baked ${ROOM_JOBS.length + 1} full 468x312 rooms into public/assets/rooms/`);
