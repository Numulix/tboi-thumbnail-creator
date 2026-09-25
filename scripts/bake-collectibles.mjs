import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25];
  const interlace = buf[28];
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
  const rawPixels = Buffer.alloc(w * h * channels);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  if (interlace === 1) {
    const xStart = [0, 4, 0, 2, 0, 1, 0];
    const yStart = [0, 0, 4, 0, 2, 0, 1];
    const xStep = [8, 8, 4, 4, 2, 2, 1];
    const yStep = [8, 8, 8, 4, 4, 2, 2];
    let rawPos = 0;
    for (let pass = 0; pass < 7; pass++) {
      const pw = Math.ceil((w - xStart[pass]) / xStep[pass]);
      const ph = Math.ceil((h - yStart[pass]) / yStep[pass]);
      if (pw <= 0 || ph <= 0) continue;
      const passPixels = Buffer.alloc(pw * ph * channels);
      const pStride = pw * channels;
      for (let py = 0; py < ph; py++) {
        const filter = raw[rawPos++];
        for (let px = 0; px < pStride; px++) {
          let val = raw[rawPos++];
          const a = px >= channels ? passPixels[py * pStride + px - channels] : 0;
          const b = py > 0 ? passPixels[(py - 1) * pStride + px] : 0;
          const c =
            px >= channels && py > 0
              ? passPixels[(py - 1) * pStride + px - channels]
              : 0;
          if (filter === 1) val = (val + a) & 255;
          else if (filter === 2) val = (val + b) & 255;
          else if (filter === 3) val = (val + ((a + b) >> 1)) & 255;
          else if (filter === 4) val = (val + paeth(a, b, c)) & 255;
          passPixels[py * pStride + px] = val;
        }
        const dstY = yStart[pass] + py * yStep[pass];
        for (let i = 0; i < pw; i++) {
          const dstX = xStart[pass] + i * xStep[pass];
          for (let ch = 0; ch < channels; ch++) {
            rawPixels[(dstY * w + dstX) * channels + ch] =
              passPixels[(py * pw + i) * channels + ch];
          }
        }
      }
    }
  } else {
    const stride = w * channels + 1;
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
        else if (filter === 4) val = (val + paeth(a, b, c)) & 255;
        rawPixels[y * w * channels + x] = val;
      }
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

const POSSESSIVES = new Map([
  ['MOMS', "Mom's"],
  ['DADS', "Dad's"],
  ['GUPPYS', "Guppy's"],
  ['TAMMYS', "Tammy's"],
  ['CRICKETS', "Cricket's"],
  ['MAXS', "Max's"],
  ['BOBS', "Bob's"],
  ['ISAACS', "Isaac's"],
  ['MAGGY', "Maggy's"],
  ['MAGGYS', "Maggy's"],
  ['CAINS', "Cain's"],
  ['JUDASS', "Judas'"],
  ['EVES', "Eve's"],
  ['SAMSONS', "Samson's"],
  ['AZAZELS', "Azazel's"],
  ['LAZARUSS', "Lazarus'"],
  ['EDENS', "Eden's"],
  ['LILITHS', "Lilith's"],
  ['KEEPERS', "Keeper's"],
  ['APOLLYONS', "Apollyon's"],
  ['BETHANYS', "Bethany's"],
  ['JACOBS', "Jacob's"],
  ['ESAUS', "Esau's"],
  ['SATANS', "Satan's"],
  ['ANGELS', "Angel's"],
  ['DEVILS', "Devil's"],
  ['DOCTORS', "Doctor's"],
  ['SPIDERS', "Spider's"],
  ['20_20', '20/20'],
]);

const EXACT_NAME_OVERRIDES = new Map([
  ['20_20', '20/20'],
  ['TECH_5', 'Tech.5'],
  ['TECHNOLOGY_2', 'Technology 2'],
  ['DR_FETUS', 'Dr. Fetus'],
  ['EPIC_FETUS', 'Epic Fetus'],
  ['E_COLI', 'E. Coli'],
  ['PHD', 'PHD'],
  ['FALSE_PHD', 'False PHD'],
  ['D6', 'The D6'],
  ['ETERNAL_D6', 'Eternal D6'],
  ['SPINDOWN_DICE', 'Spindown Dice'],
  ['R_KEY', 'R Key'],
  ['C_SECTION', 'C Section'],
  ['PSY_FLY', 'Psy Fly'],
]);

export function formatItemDisplayName(rawToken) {
  const cleaned = rawToken.replace(/^#/, '').replace(/_NAME$/, '');
  if (EXACT_NAME_OVERRIDES.has(cleaned)) {
    return EXACT_NAME_OVERRIDES.get(cleaned);
  }
  const words = cleaned.split('_').filter(Boolean);
  return words
    .map((word, idx) => {
      if (POSSESSIVES.has(word)) {
        return POSSESSIVES.get(word);
      }
      const lower = word.toLowerCase();
      if (
        idx > 0 &&
        ['of', 'the', 'in', 'a', 'an', 'and', 'to', 'for'].includes(lower)
      ) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

// 1. Parse items_metadata.xml for Quality (0..4)
const metaXml = fs.readFileSync('raw-assets/items_metadata.xml', 'utf8');
const qualityById = new Map();
const metaRegex = /<item\s+[^>]*id="(\d+)"[^>]*quality="(\d+)"[^>]*\/?>/g;
for (const match of metaXml.matchAll(metaRegex)) {
  qualityById.set(Number(match[1]), Number(match[2]));
}

// 2. Map actual files in raw-assets/gfx/items/collectibles/ case-insensitively
const collectiblesDir = path.resolve('raw-assets/gfx/items/collectibles');
const diskFiles = fs.readdirSync(collectiblesDir);
const diskFileByLower = new Map();
for (const file of diskFiles) {
  diskFileByLower.set(file.toLowerCase(), file);
}

// 3. Parse items.xml for <passive | active | familiar ... />
const itemsXml = fs.readFileSync('raw-assets/items.xml', 'utf8');
const itemTagRegex = /<(passive|active|familiar)\s+([^>]+?)\/?>/g;
const attrRegex = /(\w+)="([^"]*)"/g;

const parsedItems = [];
for (const tagMatch of itemsXml.matchAll(itemTagRegex)) {
  const kind = tagMatch[1];
  const attrString = tagMatch[2];
  const attrs = {};
  for (const attrMatch of attrString.matchAll(attrRegex)) {
    attrs[attrMatch[1]] = attrMatch[2];
  }
  const id = Number(attrs.id);
  const gfx = attrs.gfx;
  const rawName = attrs.name;
  if (!id || !gfx || !rawName) continue;

  const actualFile = diskFileByLower.get(gfx.toLowerCase());
  if (!actualFile) continue;

  const quality = Math.min(4, Math.max(0, qualityById.get(id) ?? 2));
  const name = formatItemDisplayName(rawName);

  parsedItems.push({
    id,
    name,
    kind,
    quality,
    fileName: actualFile,
  });
}

parsedItems.sort((a, b) => a.id - b.id);

// 4. Build 28-column Sprite Atlas (Slot 0 = questionmark.png for Curse of the Blind, Slots 1..N = items)
const COLS = 28;
const CELL = 32;
const totalSlots = parsedItems.length + 1;
const ROWS = Math.ceil(totalSlots / COLS);
const atlasW = COLS * CELL;
const atlasH = ROWS * CELL;
const atlasPixels = Buffer.alloc(atlasW * atlasH * 4, 0);

function stampCell(srcPngPath, slotIndex) {
  const col = slotIndex % COLS;
  const row = Math.floor(slotIndex / COLS);
  const decoded = decodePng(srcPngPath);
  const ox = col * CELL + Math.max(0, Math.floor((CELL - decoded.w) / 2));
  const oy = row * CELL + Math.max(0, Math.floor((CELL - decoded.h) / 2));
  const copyW = Math.min(CELL, decoded.w);
  const copyH = Math.min(CELL, decoded.h);

  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      const si = (y * decoded.w + x) * 4;
      const di = ((oy + y) * atlasW + (ox + x)) * 4;
      atlasPixels[di] = decoded.pixels[si];
      atlasPixels[di + 1] = decoded.pixels[si + 1];
      atlasPixels[di + 2] = decoded.pixels[si + 2];
      atlasPixels[di + 3] = decoded.pixels[si + 3];
    }
  }
  return { col, row };
}

// Slot 0: questionmark.png (Curse of the Blind)
stampCell(path.join(collectiblesDir, 'questionmark.png'), 0);

const catalogJson = parsedItems.map((item, idx) => {
  const slotIndex = idx + 1;
  const { col, row } = stampCell(
    path.join(collectiblesDir, item.fileName),
    slotIndex
  );
  return {
    id: item.id,
    name: item.name,
    kind: item.kind,
    quality: item.quality,
    atlasCol: col,
    atlasRow: row,
  };
});

fs.mkdirSync('public/assets/collectibles', { recursive: true });
fs.mkdirSync('public/assets/altars', { recursive: true });
fs.writeFileSync(
  'public/assets/collectibles/collectibles-atlas.png',
  encodePng(atlasW, atlasH, atlasPixels)
);
fs.copyFileSync(
  'raw-assets/gfx/items/levelitem_001_itemaltar.png',
  'public/assets/altars/levelitem_001_itemaltar.png'
);
fs.writeFileSync(
  'src/catalog/items.json',
  JSON.stringify(catalogJson, null, 2) + '\n'
);

console.log(
  `Packed ${catalogJson.length} collectibles + Curse of the Blind (?) into public/assets/collectibles/collectibles-atlas.png (${atlasW}x${atlasH}) and wrote src/catalog/items.json`
);
