import { createHash } from 'node:crypto';

export const FONT_LICENSE_FILES = ['public/licenses/FONT-NOTICES.json', 'public/licenses/OFL-1.1.txt'];
// Official English body from https://openfontlicense.org/documents/OFL.txt,
// excluding its example copyright header, with one final LF.
const OFL_SHA256 = 'ebc109078c06f79af74cf2b27454c262830d12a65749f0e2bf25d1ac1db7a02a';

function fontMetadata(bytes, path) {
  function requireRange(start, length) {
    if (start < 0 || length < 0 || start + length > bytes.length) throw new Error(`Invalid font metadata bounds: ${path}`);
  }
  requireRange(0, 12);
  const signature = bytes.readUInt32BE(0);
  if (signature !== 0x00010000 && signature !== 0x4f54544f) throw new Error(`Invalid font metadata format: ${path}`);
  const count = bytes.readUInt16BE(4);
  requireRange(12, count * 16);
  let table;
  let tableLength;
  for (let i = 0; i < count; i++) {
    const offset = 12 + i * 16;
    if (bytes.toString('ascii', offset, offset + 4) === 'name') {
      table = bytes.readUInt32BE(offset + 8);
      tableLength = bytes.readUInt32BE(offset + 12);
    }
  }
  if (table === undefined) throw new Error(`Missing font metadata name table: ${path}`);
  requireRange(table, tableLength);
  if (tableLength < 6) throw new Error(`Invalid font metadata name table: ${path}`);
  const records = bytes.readUInt16BE(table + 2);
  const strings = bytes.readUInt16BE(table + 4);
  if (6 + records * 12 > tableLength || strings < 6 + records * 12 || strings > tableLength) throw new Error(`Invalid font metadata records: ${path}`);
  const names = new Map();
  for (let i = 0; i < records; i++) {
    const offset = table + 6 + i * 12;
    const platform = bytes.readUInt16BE(offset);
    const id = bytes.readUInt16BE(offset + 6);
    if (![0, 3].includes(platform) || ![0, 1, 2, 14, 16, 17].includes(id)) continue;
    const length = bytes.readUInt16BE(offset + 8);
    const start = strings + bytes.readUInt16BE(offset + 10);
    if (length % 2 || start + length > tableLength) throw new Error(`Invalid font metadata string: ${path}`);
    // Unicode name records are UTF-16BE. Copy before swapping to preserve font bytes.
    const value = Buffer.from(bytes.subarray(table + start, table + start + length)).swap16().toString('utf16le');
    if (!names.has(id)) names.set(id, value);
  }
  const metadata = {
    family: names.get(16) ?? names.get(1),
    style: names.get(17) ?? names.get(2),
    copyright: names.get(0),
    license_url: names.get(14),
  };
  if (Object.values(metadata).some(value => !value)) throw new Error(`Incomplete font metadata: ${path}`);
  return metadata;
}

export function assertFontLicenses(readBytes, paths) {
  const [noticePath, licensePath] = FONT_LICENSE_FILES;
  const license = readBytes(licensePath);
  if (createHash('sha256').update(license).digest('hex') !== OFL_SHA256) throw new Error('Font license must contain the complete unmodified official OFL 1.1 body.');
  let notice;
  try {
    notice = JSON.parse(readBytes(noticePath).toString('utf8'));
  } catch {
    throw new Error('Missing or invalid font notice JSON; contents withheld.');
  }
  if (!notice || notice.license !== 'SIL Open Font License 1.1' || notice.license_file !== 'OFL-1.1.txt' || notice.official_source !== 'https://openfontlicense.org/documents/OFL.txt' || !Array.isArray(notice.fonts)) throw new Error('Invalid font notice license declaration.');
  if (notice.fonts.length !== paths.length || new Set(notice.fonts.map(font => font.path)).size !== paths.length) throw new Error('Font notices must cover every bundled font exactly once.');
  for (const path of paths) {
    const entry = notice.fonts.find(font => font.path === path);
    if (!entry) throw new Error(`Missing font notice: ${path}`);
    const metadata = fontMetadata(readBytes(path), path);
    for (const [field, value] of Object.entries(metadata)) {
      if (entry[field] !== value) throw new Error(`Font notice ${field} does not match embedded metadata: ${path}`);
    }
  }
}
