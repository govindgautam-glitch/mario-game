const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);
  let rawPos = 0;
  const prevRow = Buffer.alloc(stride);
  const currRow = Buffer.alloc(stride);
  
  for (let y = 0; y < height; y++) {
    const filter = raw[rawPos++];
    for (let i = 0; i < stride; i++) currRow[i] = raw[rawPos++];
    for (let i = 0; i < stride; i++) {
      const a = i >= bytesPerPixel ? currRow[i - bytesPerPixel] : 0;
      const b = prevRow[i];
      const c = i >= bytesPerPixel ? prevRow[i - bytesPerPixel] : 0;
      if (filter === 1) currRow[i] = (currRow[i] + a) & 0xff;
      else if (filter === 2) currRow[i] = (currRow[i] + b) & 0xff;
      else if (filter === 3) currRow[i] = (currRow[i] + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        currRow[i] = (currRow[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    }
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      if (colorType === 6) {
        pixels[dstIdx] = currRow[x * 4];
        pixels[dstIdx + 1] = currRow[x * 4 + 1];
        pixels[dstIdx + 2] = currRow[x * 4 + 2];
        pixels[dstIdx + 3] = currRow[x * 4 + 3];
      }
    }
    currRow.copy(prevRow);
  }
  return { width, height, pixels };
}

function findSprites(filePath, splitRow = 300) {
  const img = decodePNG(filePath);
  const rows = [
    { name: 'top', minY: 0, maxY: splitRow },
    { name: 'bottom', minY: splitRow, maxY: img.height }
  ];
  
  rows.forEach(r => {
    const colHasPixels = [];
    for (let x = 0; x < img.width; x++) {
      let has = false;
      for (let y = r.minY; y < r.maxY; y++) {
        if (img.pixels[(y * img.width + x) * 4 + 3] > 20) {
          has = true;
          break;
        }
      }
      colHasPixels.push(has);
    }
    
    const intervals = [];
    let inSprite = false, startX = 0;
    for (let x = 0; x < img.width; x++) {
      if (colHasPixels[x] && !inSprite) {
        inSprite = true;
        startX = x;
      } else if (!colHasPixels[x] && inSprite) {
        inSprite = false;
        intervals.push({ startX, endX: x - 1 });
      }
    }
    if (inSprite) intervals.push({ startX, endX: img.width - 1 });
    
    console.log(`=== Row ${r.name} (${intervals.length} sprites) ===`);
    intervals.forEach((inv, i) => {
      let minY = r.maxY, maxY = r.minY;
      for (let x = inv.startX; x <= inv.endX; x++) {
        for (let y = r.minY; y < r.maxY; y++) {
          if (img.pixels[(y * img.width + x) * 4 + 3] > 20) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      console.log(`Sprite ${i}: x=${inv.startX}, y=${minY}, w=${inv.endX - inv.startX + 1}, h=${maxY - minY + 1}`);
    });
  });
}

console.log('--- Mario Model All Angles ---');
findSprites(path.join(__dirname, 'mario game iamges/Mario Model All Angles.png'), 300);

console.log('--- Mario Game Pipe Element ---');
findSprites(path.join(__dirname, 'mario game iamges/Mario Game Pipe Element.png'), 600);

console.log('--- Mario Tree ---');
findSprites(path.join(__dirname, 'mario game iamges/Mario Tree.png'), 320);
