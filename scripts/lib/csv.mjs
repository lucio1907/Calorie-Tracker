/**
 * Minimal RFC 4180 CSV reader/writer (comma separator, double-quote quoting,
 * "" escapes, CRLF or LF line endings). Enough for the catalog files this
 * project ships; not a general-purpose CSV library.
 */

/**
 * Parses CSV text into rows of string cells.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cell = "";
  let inQuotes = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === '"' && cell === "") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && source[index + 1] === "\n") index += 1;
    } else {
      cell += char;
    }
    index += 1;
  }

  if (inQuotes) throw new Error("CSV: unterminated quoted field");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Quotes a cell when it contains a separator, quote or line break.
 * @param {string | number | null | undefined} value
 * @returns {string}
 */
function formatCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Serializes rows to CSV with LF line endings and a trailing newline.
 * @param {Array<Array<string | number | null | undefined>>} rows
 * @returns {string}
 */
export function formatCsv(rows) {
  return rows.map((row) => row.map(formatCell).join(",")).join("\n") + "\n";
}
