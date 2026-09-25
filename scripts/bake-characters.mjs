import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25];
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

export const CHARACTER_POSES = [
  { id: 'idle', label: 'Standing Idle', sx: 0, sy: 192, hairDx: 0, hairDy: 6 },
  {
    id: 'pickup',
    label: 'Item Pickup (Overhead)',
    sx: 64,
    sy: 192,
    hairDx: 0,
    hairDy: 8,
  },
  {
    id: 'thumbsUp',
    label: 'Thumbs-Up Approval',
    sx: 128,
    sy: 128,
    hairDx: 0,
    hairDy: 6,
  },
  {
    id: 'shocked',
    label: 'Shocked / Gasping',
    sx: 0,
    sy: 128,
    hairDx: 0,
    hairDy: 6,
  },
  {
    id: 'agony',
    label: 'Crying / Despair',
    sx: 128,
    sy: 192,
    hairDx: 2,
    hairDy: 5,
  },
  {
    id: 'cheer',
    label: 'Happy Jump',
    sx: 192,
    sy: 256,
    hairDx: 0,
    hairDy: 8,
  },
];

const CHARACTERS = [
  // Normal Playable Roster
  { id: 'isaac', name: 'Isaac', variant: 'normal', sheet: 'character_001_isaac.png' },
  { id: 'magdalene', name: 'Magdalene', variant: 'normal', sheet: 'character_002_magdalene.png' },
  { id: 'cain', name: 'Cain', variant: 'normal', sheet: 'character_003_cain.png' },
  { id: 'judas', name: 'Judas', variant: 'normal', sheet: 'character_004_judas.png' },
  { id: 'blue-baby', name: '??? (Blue Baby)', variant: 'normal', sheet: 'character_006_bluebaby.png' },
  { id: 'eve', name: 'Eve', variant: 'normal', sheet: 'character_005_eve.png' },
  { id: 'samson', name: 'Samson', variant: 'normal', sheet: 'character_007_samson.png' },
  { id: 'azazel', name: 'Azazel', variant: 'normal', sheet: 'character_008_azazel.png' },
  { id: 'lazarus', name: 'Lazarus', variant: 'normal', sheet: 'character_009_lazarus.png' },
  { id: 'lazarus-risen', name: 'Lazarus Risen', variant: 'normal', sheet: 'character_010_lazarus2.png', includeInCatalog: false },
  // Eden uses bald base poses from character_001_isaac.png so any of the 54 Eden hairstyles layers cleanly
  { id: 'eden', name: 'Eden', variant: 'normal', sheet: 'character_001_isaac.png', supportsEdenHair: true, defaultEdenHair: 1 },
  { id: 'the-lost', name: 'The Lost', variant: 'normal', sheet: 'character_012_thelost.png' },
  { id: 'lilith', name: 'Lilith', variant: 'normal', sheet: 'character_014_lilith.png' },
  { id: 'keeper', name: 'Keeper', variant: 'normal', sheet: 'character_015_keeper.png' },
  { id: 'apollyon', name: 'Apollyon', variant: 'normal', sheet: 'character_016_apollyon.png' },
  { id: 'the-forgotten', name: 'The Forgotten', variant: 'normal', sheet: 'character_017_theforgotten.png' },
  { id: 'the-soul', name: 'The Soul', variant: 'normal', sheet: 'character_018_thesoul.png', includeInCatalog: false },
  { id: 'bethany', name: 'Bethany', variant: 'normal', sheet: 'character_001x_bethany.png' },
  { id: 'jacob', name: 'Jacob & Esau', variant: 'normal', sheet: 'character_002x_jacob.png' },
  { id: 'esau', name: 'Esau', variant: 'normal', sheet: 'character_003x_esau.png', includeInCatalog: false },

  // Tainted Playable Roster
  { id: 'tainted-isaac', name: 'Tainted Isaac', variant: 'tainted', sheet: 'character_001b_isaac.png' },
  { id: 'tainted-magdalene', name: 'Tainted Magdalene', variant: 'tainted', sheet: 'character_002b_magdalene.png' },
  { id: 'tainted-cain', name: 'Tainted Cain', variant: 'tainted', sheet: 'character_003b_cain.png' },
  { id: 'tainted-judas', name: 'Tainted Judas', variant: 'tainted', sheet: 'character_004b_judas.png' },
  { id: 'tainted-blue-baby', name: 'Tainted ???', variant: 'tainted', sheet: 'character_005b_bluebaby.png' },
  { id: 'tainted-eve', name: 'Tainted Eve', variant: 'tainted', sheet: 'character_006b_eve.png' },
  { id: 'tainted-samson', name: 'Tainted Samson', variant: 'tainted', sheet: 'character_007b_samson.png' },
  { id: 'tainted-azazel', name: 'Tainted Azazel', variant: 'tainted', sheet: 'character_008b_azazel.png' },
  { id: 'tainted-lazarus', name: 'Tainted Lazarus', variant: 'tainted', sheet: 'character_009b_lazarus.png' },
  { id: 'tainted-eden', name: 'Tainted Eden', variant: 'tainted', sheet: 'character_001b_isaac.png', supportsEdenHair: true, defaultEdenHair: 21 },
  { id: 'tainted-lost', name: 'Tainted Lost', variant: 'tainted', sheet: 'character_012b_thelost.png' },
  { id: 'tainted-lilith', name: 'Tainted Lilith', variant: 'tainted', sheet: 'character_014b_lilith.png' },
  { id: 'tainted-keeper', name: 'Tainted Keeper', variant: 'tainted', sheet: 'character_015b_keeper.png' },
  { id: 'tainted-apollyon', name: 'Tainted Apollyon', variant: 'tainted', sheet: 'character_016b_apollyon.png' },
  { id: 'tainted-forgotten', name: 'Tainted Forgotten', variant: 'tainted', sheet: 'character_016b_theforgotten.png' },
  { id: 'tainted-soul', name: 'Tainted Soul', variant: 'tainted', sheet: 'character_017b_thesoul.png', includeInCatalog: false },
  { id: 'tainted-bethany', name: 'Tainted Bethany', variant: 'tainted', sheet: 'character_018b_bethany.png' },
  { id: 'tainted-jacob', name: 'Tainted Jacob', variant: 'tainted', sheet: 'character_019b_jacob.png' },
];

const costumesDir = path.resolve('raw-assets/gfx/characters/costumes');
const outDir = path.resolve('public/assets/characters');
fs.mkdirSync(outDir, { recursive: true });

// 1. Bake characters-atlas.png (6 cols of 64x64 = 384px wide, CHARACTERS.length rows of 64px)
const charAtlasW = CHARACTER_POSES.length * 64; // 384
const charAtlasH = CHARACTERS.length * 64; // 38 * 64 = 2432
const charAtlasPixels = Buffer.alloc(charAtlasW * charAtlasH * 4);

const catalogCharacters = [];

for (let row = 0; row < CHARACTERS.length; row++) {
  const ch = CHARACTERS[row];
  const srcImg = decodePng(path.join(costumesDir, ch.sheet));

  for (let col = 0; col < CHARACTER_POSES.length; col++) {
    const pose = CHARACTER_POSES[col];
    const destX0 = col * 64;
    const destY0 = row * 64;

    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const si = ((pose.sy + y) * srcImg.w + (pose.sx + x)) * 4;
        const di = ((destY0 + y) * charAtlasW + (destX0 + x)) * 4;
        charAtlasPixels[di] = srcImg.pixels[si];
        charAtlasPixels[di + 1] = srcImg.pixels[si + 1];
        charAtlasPixels[di + 2] = srcImg.pixels[si + 2];
        charAtlasPixels[di + 3] = srcImg.pixels[si + 3];
      }
    }
  }

  if (ch.includeInCatalog !== false) {
    catalogCharacters.push({
      id: ch.id,
      name: ch.name,
      variant: ch.variant,
      atlasRow: row,
      supportsEdenHair: Boolean(ch.supportsEdenHair),
      defaultEdenHair: ch.defaultEdenHair ?? null,
    });
  }
}

fs.writeFileSync(
  path.join(outDir, 'characters-atlas.png'),
  encodePng(charAtlasW, charAtlasH, charAtlasPixels)
);

// 2. Bake eden-hairs-atlas.png (9 cols x 6 rows of 64x64 = 576x384 px for all 54 Eden hairstyles)
const hairCols = 9;
const hairRows = 6;
const hairAtlasW = hairCols * 64; // 576
const hairAtlasH = hairRows * 64; // 384
const hairAtlasPixels = Buffer.alloc(hairAtlasW * hairAtlasH * 4);
const edenHairs = [];

for (let i = 1; i <= 54; i++) {
  const fileName = `character_009_edenhair${i}.png`;
  const hairImg = decodePng(path.join(costumesDir, fileName));
  const idx = i - 1;
  const col = idx % hairCols;
  const row = Math.floor(idx / hairCols);
  const dx0 = col * 64;
  const dy0 = row * 64;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      // Frame 0 (x=0..63, y=0..63) is the front-facing hairstyle sprite
      const si = (y * hairImg.w + x) * 4;
      const di = ((dy0 + y) * hairAtlasW + (dx0 + x)) * 4;
      hairAtlasPixels[di] = hairImg.pixels[si];
      hairAtlasPixels[di + 1] = hairImg.pixels[si + 1];
      hairAtlasPixels[di + 2] = hairImg.pixels[si + 2];
      hairAtlasPixels[di + 3] = hairImg.pixels[si + 3];
    }
  }

  edenHairs.push({
    id: i,
    label: `Eden Hair #${i}`,
    col,
    row,
  });
}

fs.writeFileSync(
  path.join(outDir, 'eden-hairs-atlas.png'),
  encodePng(hairAtlasW, hairAtlasH, hairAtlasPixels)
);

// 3. Write src/catalog/characters.json
const catalogPayload = {
  poses: CHARACTER_POSES.map((p, colIndex) => ({
    id: p.id,
    label: p.label,
    atlasCol: colIndex,
    hairDx: p.hairDx,
    hairDy: p.hairDy,
  })),
  characters: catalogCharacters,
  edenHairs,
};

fs.writeFileSync(
  path.resolve('src/catalog/characters.json'),
  JSON.stringify(catalogPayload, null, 2) + '\n'
);

console.log(
  `Baked ${CHARACTERS.length} characters x ${CHARACTER_POSES.length} poses into public/assets/characters/characters-atlas.png (${charAtlasW}x${charAtlasH}) and 54 Eden hairstyles into eden-hairs-atlas.png (${hairAtlasW}x${hairAtlasH})`
);
