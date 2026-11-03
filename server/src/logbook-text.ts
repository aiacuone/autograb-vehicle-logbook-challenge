import { AppError } from './errors.js';

// fatal: invalid UTF-8 throws. A leading UTF-8 byte-order mark is stripped.
const utf8 = new TextDecoder('utf-8', { fatal: true });

// Tab, line feed, form feed and carriage return are normal in text files
const allowedControlCodes = new Set([0x09, 0x0a, 0x0c, 0x0d]);

function hasBinaryCharacters(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code < 0x20 && !allowedControlCodes.has(code)) || code === 0x7f)
      return true;
  }
  return false;
}

const notText = () =>
  new AppError(
    'FILE_NOT_TEXT',
    'Only plain text files are accepted.',
    'logbook',
  );

/**
 * Returns the file's text if it is valid UTF-8 with no binary characters. The file
 * name is never checked, only the content. A UTF-16 file fails because of its NUL bytes.
 */
export function readLogbookText(file: Buffer): string {
  if (file.length === 0) {
    throw new AppError('FILE_MISSING', 'The logbook file is empty.', 'logbook');
  }
  let text: string;
  try {
    text = utf8.decode(file);
  } catch {
    throw notText();
  }
  if (hasBinaryCharacters(text)) throw notText();
  return text;
}
