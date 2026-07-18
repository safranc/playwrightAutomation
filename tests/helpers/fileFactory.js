const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const ACCEPTED_FILE_TYPES = [
  { label: 'PDF', mimeType: 'application/pdf', extension: '.pdf' },
  {
    label: 'DOCX',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
  },
  { label: 'JPG', mimeType: 'image/jpeg', extension: '.jpg' },
  { label: 'PNG', mimeType: 'image/png', extension: '.png' },
];

const tempRoot = path.join(__dirname, '..', 'tmp');

// Converts a size value into bytes for file generation.
function parseSizeToBytes(size) {
  if (typeof size === 'number' && Number.isFinite(size)) return size;

  const input = String(size || '256KB').trim().toUpperCase();
  const match = input.match(/^(\d+)(B|KB|MB)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}. Use values like 500KB, 2MB, 1024B.`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 'B') return value;
  if (unit === 'KB') return value * 1024;
  return value * 1024 * 1024;
}

// Normalizes a file base name so it is safe to use on disk.
function sanitizeBaseName(name) {
  return String(name || 'user-upload')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

// Builds a small header that matches the file type being created.
function buildHeaderForType(mimeType) {
  if (mimeType === 'application/pdf') return Buffer.from('%PDF-1.4\n');
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  }
  if (mimeType === 'image/jpeg') return Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  if (mimeType === 'image/png') return Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  return Buffer.from('FILE');
}

// Finds the accepted file type metadata for a MIME type.
function findTypeByMime(mimeType) {
  return ACCEPTED_FILE_TYPES.find((entry) => entry.mimeType === mimeType);
}

// Creates a temporary file for a supported upload type.
async function create({ name, type, size = '256KB' }) {
  const typeEntry = findTypeByMime(type);
  if (!typeEntry) {
    throw new Error(`Unsupported type for factory: ${type}`);
  }

  const sizeBytes = parseSizeToBytes(size);
  const baseName = sanitizeBaseName(name || 'user-upload');
  const randomPart = crypto.randomUUID().slice(0, 8);
  const fileName = `${baseName}-${randomPart}${typeEntry.extension}`;
  const filePath = path.join(tempRoot, fileName);

  await fs.mkdir(tempRoot, { recursive: true });

  const header = buildHeaderForType(typeEntry.mimeType);
  const content =
    sizeBytes <= header.length
      ? header.subarray(0, sizeBytes)
      : Buffer.concat([header, Buffer.alloc(sizeBytes - header.length, 0x41)]);

  await fs.writeFile(filePath, content);

  return {
    name: fileName,
    path: filePath,
    type: typeEntry.mimeType,
    sizeBytes,
    extension: typeEntry.extension,
  };
}

// Creates a temporary file with a custom extension and MIME type.
async function createCustom({ name, extension, size = '256KB', mimeType = 'application/octet-stream' }) {
  const sizeBytes = parseSizeToBytes(size);
  const baseName = sanitizeBaseName(name || 'custom-upload');
  const randomPart = crypto.randomUUID().slice(0, 8);
  const safeExtension = String(extension || '.bin').startsWith('.') ? extension : `.${extension}`;
  const fileName = `${baseName}-${randomPart}${safeExtension.toLowerCase()}`;
  const filePath = path.join(tempRoot, fileName);

  await fs.mkdir(tempRoot, { recursive: true });

  const header = buildHeaderForType(mimeType);
  const content =
    sizeBytes <= header.length
      ? header.subarray(0, sizeBytes)
      : Buffer.concat([header, Buffer.alloc(sizeBytes - header.length, 0x41)]);

  await fs.writeFile(filePath, content);

  return {
    name: fileName,
    path: filePath,
    type: mimeType,
    sizeBytes,
    extension: safeExtension.toLowerCase(),
  };
}

// Deletes one generated temp file if it exists.
async function cleanup(filePath) {
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

// Removes the entire temp file directory used by the factory.
async function cleanupAll() {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

module.exports = {
  ACCEPTED_FILE_TYPES,
  create,
  createCustom,
  cleanup,
  cleanupAll,
};
