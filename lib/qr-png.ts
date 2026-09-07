import { deflateSync } from "node:zlib";

const VERSION = 4;
const MODULE_COUNT = VERSION * 4 + 17;
const DATA_CODEWORDS = 64;
const BLOCK_COUNT = 2;
const DATA_CODEWORDS_PER_BLOCK = DATA_CODEWORDS / BLOCK_COUNT;
const ERROR_CORRECTION_CODEWORDS_PER_BLOCK = 18;
const QUIET_ZONE_MODULES = 4;
const SCALE = 12;
const ERROR_CORRECTION_LEVEL_M = 0;

type Matrix = Array<Array<boolean | null>>;
type Rgba = readonly [number, number, number, number];

export type QrPngOptions = {
  foreground?: Rgba;
  background?: Rgba;
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

let fieldValue = 1;
for (let index = 0; index < 255; index += 1) {
  GF_EXP[index] = fieldValue;
  GF_LOG[fieldValue] = index;
  fieldValue <<= 1;
  if (fieldValue & 0x100) fieldValue ^= 0x11d;
}
for (let index = 255; index < GF_EXP.length; index += 1) {
  GF_EXP[index] = GF_EXP[index - 255];
}

function multiplyInGaloisField(left: number, right: number) {
  if (left === 0 || right === 0) return 0;
  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function errorCorrectionGenerator(degree: number) {
  let polynomial = [1];

  for (let exponent = 0; exponent < degree; exponent += 1) {
    const next = Array.from({ length: polynomial.length + 1 }, () => 0);
    for (let index = 0; index < polynomial.length; index += 1) {
      next[index] ^= polynomial[index];
      next[index + 1] ^= multiplyInGaloisField(polynomial[index], GF_EXP[exponent]);
    }
    polynomial = next;
  }

  return polynomial;
}

function errorCorrectionCodewords(data: number[]) {
  const generator = errorCorrectionGenerator(ERROR_CORRECTION_CODEWORDS_PER_BLOCK);
  const remainder = [...data, ...Array.from({ length: ERROR_CORRECTION_CODEWORDS_PER_BLOCK }, () => 0)];

  for (let index = 0; index < data.length; index += 1) {
    const factor = remainder[index];
    if (factor === 0) continue;
    for (let generatorIndex = 0; generatorIndex < generator.length; generatorIndex += 1) {
      remainder[index + generatorIndex] ^= multiplyInGaloisField(generator[generatorIndex], factor);
    }
  }

  return remainder.slice(-ERROR_CORRECTION_CODEWORDS_PER_BLOCK);
}

function appendBits(target: number[], value: number, bitCount: number) {
  for (let bit = bitCount - 1; bit >= 0; bit -= 1) {
    target.push((value >>> bit) & 1);
  }
}

function makeCodewords(content: string) {
  const bytes = Buffer.from(content, "utf8");
  // Version 4 / nivel M permite hasta 62 bytes en modo byte.
  if (bytes.length > 62) {
    throw new Error("La URL es demasiado larga para generar el QR permanente.");
  }

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let value = 0;
    for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[index + bit];
    data.push(value);
  }

  const padding = [0xec, 0x11];
  while (data.length < DATA_CODEWORDS) data.push(padding[data.length % 2]);

  const blocks = Array.from({ length: BLOCK_COUNT }, (_, index) =>
    data.slice(index * DATA_CODEWORDS_PER_BLOCK, (index + 1) * DATA_CODEWORDS_PER_BLOCK),
  );
  const correctionBlocks = blocks.map(errorCorrectionCodewords);
  const interleaved: number[] = [];

  for (let index = 0; index < DATA_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of blocks) interleaved.push(block[index]);
  }
  for (let index = 0; index < ERROR_CORRECTION_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of correctionBlocks) interleaved.push(block[index]);
  }

  return interleaved;
}

function createMatrix(): Matrix {
  return Array.from({ length: MODULE_COUNT }, () =>
    Array.from({ length: MODULE_COUNT }, () => null),
  );
}

function addFinder(matrix: Matrix, row: number, column: number) {
  for (let rowOffset = -1; rowOffset <= 7; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 7; columnOffset += 1) {
      const targetRow = row + rowOffset;
      const targetColumn = column + columnOffset;
      if (targetRow < 0 || targetRow >= MODULE_COUNT || targetColumn < 0 || targetColumn >= MODULE_COUNT) continue;

      matrix[targetRow][targetColumn] =
        rowOffset >= 0 &&
        rowOffset <= 6 &&
        columnOffset >= 0 &&
        columnOffset <= 6 &&
        (rowOffset === 0 || rowOffset === 6 || columnOffset === 0 || columnOffset === 6 ||
          (rowOffset >= 2 && rowOffset <= 4 && columnOffset >= 2 && columnOffset <= 4));
    }
  }
}

function addAlignment(matrix: Matrix, row: number, column: number) {
  for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
    for (let columnOffset = -2; columnOffset <= 2; columnOffset += 1) {
      matrix[row + rowOffset][column + columnOffset] =
        Math.abs(rowOffset) === 2 || Math.abs(columnOffset) === 2 || (rowOffset === 0 && columnOffset === 0);
    }
  }
}

function createBaseMatrix() {
  const matrix = createMatrix();
  addFinder(matrix, 0, 0);
  addFinder(matrix, MODULE_COUNT - 7, 0);
  addFinder(matrix, 0, MODULE_COUNT - 7);

  for (let index = 8; index < MODULE_COUNT - 8; index += 1) {
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
  }

  addAlignment(matrix, 26, 26);
  return matrix;
}

function bchDigit(value: number) {
  let digit = 0;
  let current = value;
  while (current !== 0) {
    digit += 1;
    current >>>= 1;
  }
  return digit;
}

function formatInformation(mask: number) {
  const data = (ERROR_CORRECTION_LEVEL_M << 3) | mask;
  let remainder = data << 10;
  while (bchDigit(remainder) >= bchDigit(0x537)) {
    remainder ^= 0x537 << (bchDigit(remainder) - bchDigit(0x537));
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function addFormatInformation(matrix: Matrix, mask: number) {
  const bits = formatInformation(mask);

  for (let index = 0; index < 15; index += 1) {
    const value = ((bits >>> index) & 1) === 1;
    if (index < 6) matrix[index][8] = value;
    else if (index < 8) matrix[index + 1][8] = value;
    else matrix[MODULE_COUNT - 15 + index][8] = value;

    if (index < 8) matrix[8][MODULE_COUNT - index - 1] = value;
    else if (index < 9) matrix[8][15 - index] = value;
    else matrix[8][15 - index - 1] = value;
  }

  matrix[MODULE_COUNT - 8][8] = true;
}

function maskApplies(mask: number, row: number, column: number) {
  switch (mask) {
    case 0:
      return (row + column) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return column % 3 === 0;
    case 3:
      return (row + column) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
    case 5:
      return ((row * column) % 2) + ((row * column) % 3) === 0;
    case 6:
      return (((row * column) % 2) + ((row * column) % 3)) % 2 === 0;
    case 7:
      return (((row * column) % 3) + ((row + column) % 2)) % 2 === 0;
    default:
      return false;
  }
}

function addData(matrix: Matrix, codewords: number[], mask: number) {
  let row = MODULE_COUNT - 1;
  let increment = -1;
  let byteIndex = 0;
  let bitIndex = 7;

  for (let column = MODULE_COUNT - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;

    while (true) {
      for (let offset = 0; offset < 2; offset += 1) {
        const targetColumn = column - offset;
        if (matrix[row][targetColumn] !== null) continue;

        let value = byteIndex < codewords.length && ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        if (maskApplies(mask, row, targetColumn)) value = !value;
        matrix[row][targetColumn] = value;

        bitIndex -= 1;
        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
      }

      row += increment;
      if (row < 0 || row >= MODULE_COUNT) {
        row -= increment;
        increment = -increment;
        break;
      }
    }
  }
}

function lostPoints(matrix: Matrix) {
  let score = 0;

  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let column = 0; column < MODULE_COUNT; column += 1) {
      const value = matrix[row][column] === true;
      if (
        row + 1 < MODULE_COUNT &&
        column + 1 < MODULE_COUNT &&
        matrix[row + 1][column] === value &&
        matrix[row][column + 1] === value &&
        matrix[row + 1][column + 1] === value
      ) {
        score += 3;
      }
    }
  }

  const sequences = Array.from({ length: MODULE_COUNT * 2 }, (_, index) =>
    index < MODULE_COUNT
      ? matrix[index].map((value) => value === true)
      : matrix.map((row) => row[index - MODULE_COUNT] === true),
  );

  for (const sequence of sequences) {
    let run = 1;
    for (let index = 1; index < sequence.length; index += 1) {
      if (sequence[index] === sequence[index - 1]) run += 1;
      else {
        if (run >= 5) score += 3 + run - 5;
        run = 1;
      }
    }
    if (run >= 5) score += 3 + run - 5;

    for (let index = 0; index <= sequence.length - 7; index += 1) {
      if (
        sequence[index] &&
        !sequence[index + 1] &&
        sequence[index + 2] &&
        sequence[index + 3] &&
        sequence[index + 4] &&
        !sequence[index + 5] &&
        sequence[index + 6]
      ) {
        const hasLightBefore = index >= 4 && sequence.slice(index - 4, index).every((value) => !value);
        const hasLightAfter = index + 11 <= sequence.length && sequence.slice(index + 7, index + 11).every((value) => !value);
        if (hasLightBefore || hasLightAfter) score += 40;
      }
    }
  }

  const darkModules = matrix.flat().filter((value) => value === true).length;
  const ratio = (darkModules * 100) / (MODULE_COUNT * MODULE_COUNT);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}

function createQrMatrix(content: string) {
  const codewords = makeCodewords(content);
  let bestMatrix: Matrix | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = createBaseMatrix();
    addFormatInformation(matrix, mask);
    addData(matrix, codewords, mask);
    const score = lostPoints(matrix);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = matrix;
    }
  }

  if (!bestMatrix) throw new Error("No se pudo construir el QR.");
  return bestMatrix;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  return chunk;
}

function matrixToPng(matrix: Matrix, options: QrPngOptions) {
  const foreground = options.foreground ?? [0, 0, 0, 255];
  const background = options.background ?? [255, 255, 255, 255];
  const size = (MODULE_COUNT + QUIET_ZONE_MODULES * 2) * SCALE;
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    raw[rowOffset] = 0;
    const matrixRow = Math.floor(y / SCALE) - QUIET_ZONE_MODULES;
    for (let x = 0; x < size; x += 1) {
      const matrixColumn = Math.floor(x / SCALE) - QUIET_ZONE_MODULES;
      const dark =
        matrixRow >= 0 &&
        matrixRow < MODULE_COUNT &&
        matrixColumn >= 0 &&
        matrixColumn < MODULE_COUNT &&
        matrix[matrixRow][matrixColumn] === true;
      const pixelOffset = rowOffset + 1 + x * 4;
      const color = dark ? foreground : background;
      raw[pixelOffset] = color[0];
      raw[pixelOffset + 1] = color[1];
      raw[pixelOffset + 2] = color[2];
      raw[pixelOffset + 3] = color[3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function createPermanentQrPng(content: string, options: QrPngOptions = {}) {
  return matrixToPng(createQrMatrix(content), options);
}
