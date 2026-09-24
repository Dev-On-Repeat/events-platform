const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

function createHackB4Icon(size) {
  const png = new PNG({ width: size, height: size });
  const scale = size / 32;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const nx = x / scale;
      const ny = y / scale;

      // Rounded squircle (radius 7 in 32x32 space)
      const r = 7;
      let inside = true;
      if (nx < r && ny < r) {
        if ((nx - r) ** 2 + (ny - r) ** 2 > r * r) inside = false;
      } else if (nx > 31 - r && ny < r) {
        if ((nx - (31 - r)) ** 2 + (ny - r) ** 2 > r * r) inside = false;
      } else if (nx < r && ny > 31 - r) {
        if ((nx - r) ** 2 + (ny - (31 - r)) ** 2 > r * r) inside = false;
      } else if (nx > 31 - r && ny > 31 - r) {
        if ((nx - (31 - r)) ** 2 + (ny - (31 - r)) ** 2 > r * r) inside = false;
      }

      if (!inside) {
        png.data[idx + 3] = 0;
        continue;
      }

      // Base gradient: #2563EB (37, 99, 235) to #7C3AED (124, 58, 237)
      const t = (nx + ny) / 62;
      let red = Math.round(37 * (1 - t) + 124 * t);
      let green = Math.round(99 * (1 - t) + 58 * t);
      let blue = Math.round(235 * (1 - t) + 237 * t);
      let alpha = 255;

      // Ticket outline in 32x32 space
      const isTicketBorder =
        ((nx >= 7 && nx <= 24 && (Math.abs(ny - 8) < 0.8 || Math.abs(ny - 23) < 0.8)) ||
         (ny >= 8 && ny <= 23 && (Math.abs(nx - 7) < 0.8 || Math.abs(nx - 24) < 0.8))) &&
        !(nx < 10 && ny >= 14 && ny <= 17) &&
        !(nx > 21 && ny >= 14 && ny <= 17);

      // Notches
      const isNotchLeft = ((nx - 7) ** 2 + (ny - 15.5) ** 2 < 2.5 ** 2);
      const isNotchRight = ((nx - 24) ** 2 + (ny - 15.5) ** 2 < 2.5 ** 2);

      // Inside ticket fill
      const isInsideTicket =
        nx > 7 && nx < 24 && ny > 8 && ny < 23 && !isNotchLeft && !isNotchRight;

      if (isInsideTicket) {
        // Subtle lighter wash inside ticket
        red = Math.min(255, red + 25);
        green = Math.min(255, green + 25);
        blue = Math.min(255, blue + 35);
      }

      if (isTicketBorder || (isNotchLeft && Math.abs((nx - 7) ** 2 + (ny - 15.5) ** 2 - 2.5 ** 2) < 1.2) ||
                            (isNotchRight && Math.abs((nx - 24) ** 2 + (ny - 15.5) ** 2 - 2.5 ** 2) < 1.2)) {
        red = 255;
        green = 255;
        blue = 255;
      }

      // Hack prompt `>`:
      const d1 = Math.abs((ny - 15.5) - (nx - 11)); // top leg of >
      const d2 = Math.abs((ny - 15.5) + (nx - 11)); // bottom leg of >
      if ((ny <= 15.5 && d1 < 1.2 && nx >= 11 && nx <= 15) ||
          (ny >= 15.5 && d2 < 1.2 && nx >= 11 && nx <= 15)) {
        red = 255;
        green = 255;
        blue = 255;
      }

      // Cursor `_` in bright blue/cyan
      if (ny >= 19 && ny <= 20.5 && nx >= 17 && nx <= 21) {
        red = 147;
        green = 197;
        blue = 253;
      }

      png.data[idx] = red;
      png.data[idx + 1] = green;
      png.data[idx + 2] = blue;
      png.data[idx + 3] = alpha;
    }
  }

  return PNG.sync.write(png);
}

function makeIco(pngBuffer, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size === 256 ? 0 : size, 0); // width
  dirEntry.writeUInt8(size === 256 ? 0 : size, 1); // height
  dirEntry.writeUInt8(0, 2); // colors
  dirEntry.writeUInt8(0, 3); // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // size
  dirEntry.writeUInt32LE(22, 12); // offset (6 + 16)

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

const png32 = createHackB4Icon(32);
const ico = makeIco(png32, 32);

// Write to src/app and public
fs.writeFileSync(path.join(__dirname, '../src/app/favicon.ico'), ico);
fs.writeFileSync(path.join(__dirname, '../public/favicon.ico'), ico);
fs.writeFileSync(path.join(__dirname, '../public/icon.png'), png32);

console.log('Successfully generated favicon.ico (src/app and public) and icon.png (public)!');
