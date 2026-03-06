export default class GIFEncoder {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.frames = [];
    this.delay = 50;
  }

  setDelay(ms) {
    this.delay = ms;
  }

  addFrame(ctx) {
    this.frames.push(new Uint8Array(ctx.getImageData(0, 0, this.w, this.h).data));
  }

  finish() {
    const w = this.w;
    const h = this.h;
    const buf = [];
    const wb = (b) => buf.push(b & 0xff);
    const ws = (s) => {
      wb(s);
      wb(s >> 8);
    };
    const wstr = (s) => {
      for (let i = 0; i < s.length; i += 1) wb(s.charCodeAt(i));
    };

    const quantize = (px) => {
      const counts = new Map();
      for (let i = 0; i < px.length; i += 4) {
        const key = ((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256);
      const palette = new Uint8Array(256 * 3);
      const lookup = new Map();

      for (let i = 0; i < colors.length; i += 1) {
        const key = colors[i][0];
        palette[i * 3] = ((key >> 10) & 31) << 3;
        palette[i * 3 + 1] = ((key >> 5) & 31) << 3;
        palette[i * 3 + 2] = (key & 31) << 3;
        lookup.set(key, i);
      }

      const indices = new Uint8Array(px.length / 4);
      for (let i = 0; i < indices.length; i += 1) {
        const key = ((px[i * 4] >> 3) << 10) | ((px[i * 4 + 1] >> 3) << 5) | (px[i * 4 + 2] >> 3);
        if (lookup.has(key)) {
          indices[i] = lookup.get(key);
          continue;
        }

        let best = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let j = 0; j < Math.min(colors.length, 256); j += 1) {
          const dr = px[i * 4] - palette[j * 3];
          const dg = px[i * 4 + 1] - palette[j * 3 + 1];
          const db = px[i * 4 + 2] - palette[j * 3 + 2];
          const distance = dr * dr + dg * dg + db * db;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = j;
          }
        }

        indices[i] = best;
        lookup.set(key, best);
      }

      return { palette, indices };
    };

    const lzw = (indices, minCodeSize) => {
      const clearCode = 1 << minCodeSize;
      const endCode = clearCode + 1;
      let codeSize = minCodeSize + 1;
      let nextCode = endCode + 1;
      const table = new Map();
      const output = [];
      let currentByte = 0;
      let bitPos = 0;

      const writeBits = (code, size) => {
        currentByte |= code << bitPos;
        bitPos += size;
        while (bitPos >= 8) {
          output.push(currentByte & 0xff);
          currentByte >>= 8;
          bitPos -= 8;
        }
      };

      const reset = () => {
        table.clear();
        for (let i = 0; i < clearCode; i += 1) table.set(String(i), i);
        nextCode = endCode + 1;
        codeSize = minCodeSize + 1;
      };

      reset();
      writeBits(clearCode, codeSize);

      if (!indices.length) {
        writeBits(endCode, codeSize);
        if (bitPos > 0) output.push(currentByte & 0xff);
        return output;
      }

      let current = String(indices[0]);
      for (let i = 1; i < indices.length; i += 1) {
        const next = String(indices[i]);
        const combo = `${current},${next}`;
        if (table.has(combo)) {
          current = combo;
        } else {
          writeBits(table.get(current), codeSize);
          if (nextCode < 4096) {
            table.set(combo, nextCode);
            nextCode += 1;
            if (nextCode > (1 << codeSize) && codeSize < 12) codeSize += 1;
          } else {
            writeBits(clearCode, codeSize);
            reset();
          }
          current = next;
        }
      }

      writeBits(table.get(current), codeSize);
      writeBits(endCode, codeSize);
      if (bitPos > 0) output.push(currentByte & 0xff);
      return output;
    };

    wstr("GIF89a");
    ws(w);
    ws(h);
    wb(0x70);
    wb(0);
    wb(0);
    wb(0x21);
    wb(0xff);
    wb(11);
    wstr("NETSCAPE2.0");
    wb(3);
    wb(1);
    ws(0);
    wb(0);

    for (const frame of this.frames) {
      const { palette, indices } = quantize(frame);
      wb(0x21);
      wb(0xf9);
      wb(4);
      wb(0);
      ws(Math.round(this.delay / 10));
      wb(0);
      wb(0);
      wb(0x2c);
      ws(0);
      ws(0);
      ws(w);
      ws(h);
      wb(0x87);
      for (let i = 0; i < palette.length; i += 1) buf.push(palette[i]);
      for (let i = palette.length; i < 768; i += 1) buf.push(0);
      wb(8);
      const compressed = lzw(indices, 8);
      let pointer = 0;
      while (pointer < compressed.length) {
        const chunk = Math.min(255, compressed.length - pointer);
        wb(chunk);
        for (let i = 0; i < chunk; i += 1) {
          buf.push(compressed[pointer]);
          pointer += 1;
        }
      }
      wb(0);
    }

    wb(0x3b);
    return new Blob([new Uint8Array(buf)], { type: "image/gif" });
  }
}
