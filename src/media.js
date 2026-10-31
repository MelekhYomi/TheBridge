// Upload checks for the media library. A file's type comes from its first bytes,
// never from its name or what the browser claims, and only these types are
// accepted. SVG and HTML are refused because they can carry scripts.

// Vercel caps a request at 4.5 MB, and base64 adds a third, so files stay under 3 MB.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const TYPES = [
  { type: 'image/jpeg', ext: 'jpg', kind: 'image', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', kind: 'image', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/webp', ext: 'webp', kind: 'image', test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
  { type: 'image/gif', ext: 'gif', kind: 'image', test: (b) => ascii(b, 0, 4) === 'GIF8' },
  { type: 'audio/mpeg', ext: 'mp3', kind: 'audio', test: (b) => ascii(b, 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { type: 'audio/wav', ext: 'wav', kind: 'audio', test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE' },
  { type: 'audio/ogg', ext: 'ogg', kind: 'audio', test: (b) => ascii(b, 0, 4) === 'OggS' },
  // MP4 and M4A share a container; the brand tells them apart.
  { type: 'audio/mp4', ext: 'm4a', kind: 'audio', test: (b) => ascii(b, 4, 8) === 'ftyp' && /^M4A|^M4B/.test(ascii(b, 8, 12)) },
  { type: 'video/mp4', ext: 'mp4', kind: 'video', test: (b) => ascii(b, 4, 8) === 'ftyp' },
  { type: 'video/webm', ext: 'webm', kind: 'video', test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
];

function ascii(b, start, end) {
  return b.subarray(start, end).toString('latin1');
}

export function sniff(bytes) {
  return TYPES.find((t) => bytes.length > 12 && t.test(bytes)) || null;
}

export const ALLOWED_TYPES = new Set(TYPES.map((t) => t.type));

/**
 * Checks a data: URL from the admin upload form.
 * Returns { ok: true, file, kind } or { ok: false, error }.
 */
export function parseUpload(dataUrl, name) {
  const m = /^data:[\w/+.-]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { ok: false, error: 'No file was received.' };
  const bytes = Buffer.from(m[1], 'base64');
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: 'That file is over 3 MB. Shrink it, or put long videos on YouTube and paste the link.' };
  const t = sniff(bytes);
  if (!t) return { ok: false, error: 'That file type is not supported. Use JPG, PNG, WebP or GIF images, MP3, M4A, WAV or OGG audio, or MP4 or WebM video.' };
  const base = String(name || 'file').replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'file';
  return { ok: true, kind: t.kind, file: { name: `${base}.${t.ext}`, type: t.type, data: bytes.toString('base64') }, size: bytes.length };
}

export const kindOf = (type) => (TYPES.find((t) => t.type === type) || {}).kind || 'file';
