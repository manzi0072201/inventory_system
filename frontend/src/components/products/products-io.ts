import type { Product } from "@/lib/products-data";

export type ImportColumn = {
  key: string;
  required: boolean;
  hint: string;
};

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "Name", required: true, hint: "e.g. Bose QuietComfort Ultra Headphones" },
  { key: "Code", required: true, hint: "Unique code, e.g. EL-0101 — must not already exist" },
  { key: "Brand", required: true, hint: "e.g. Sony" },
  { key: "Category", required: true, hint: "e.g. Audio" },
  { key: "Warehouse", required: true, hint: "e.g. Main Warehouse" },
  { key: "Cost", required: true, hint: "Number ≥ 0, e.g. 320.00" },
  { key: "Price", required: true, hint: "Number ≥ 0, e.g. 429.00" },
  { key: "Quantity", required: true, hint: "Number ≥ 0, e.g. 109.00" },
  { key: "Type", required: false, hint: "Single or Variable — defaults to Single" },
  { key: "Unit", required: false, hint: "pc, kg, g, l, ml, box, pack, set — defaults to pc" },
  { key: "Image URL", required: false, hint: "https://… — leave empty for no image" },
  { key: "Thumbnail Background", required: false, hint: "Hex color, e.g. #f3f4f6 — defaults to #f3f4f6" },
];

export type ImportRowStatus = {
  line: number;
  code: string;
  name: string;
  brand: string;
  category: string;
  product: Product | null;
  errors: string[];
};

export type ParsedImport = {
  fatalErrors: string[];
  rows: ImportRowStatus[];
};

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function dateStamp(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function productsToCsv(items: Product[]): string {
  const header = IMPORT_COLUMNS.map((column) => column.key);
  const lines = [header.join(",")];
  for (const product of items) {
    const cells = [
      product.name,
      product.code,
      product.brand,
      product.category,
      product.warehouse,
      product.cost.toFixed(2),
      product.price.toFixed(2),
      product.quantity.toFixed(2),
      product.type,
      product.unit,
      product.image,
      product.imageBg,
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function importTemplateCsv(): string {
  const example = [
    "Bose QuietComfort Ultra Headphones",
    "EL-0101",
    "Bose",
    "Audio",
    "Main Warehouse",
    "320.00",
    "429.00",
    "109.00",
    "Single",
    "pc",
    "",
    "#f3f4f6",
  ];
  return `\uFEFF${IMPORT_COLUMNS.map((column) => column.key).join(",")}\r\n${example.map(csvEscape).join(",")}\r\n`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadProductsCsv(items: Product[]): void {
  downloadTextFile(`stocky-products-${dateStamp()}.csv`, productsToCsv(items));
}

function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (inQuotes) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function parseNumber(raw: string): number | null {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseProductsCsv(
  text: string,
  existing: Product[],
): ParsedImport {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { fatalErrors: ["The file is empty — nothing to import."], rows: [] };
  }

  const headerCells = rows[0].map((cell) => cell.trim().toLowerCase());
  const columnIndex: Record<string, number> = {};
  for (const column of IMPORT_COLUMNS) {
    const at = headerCells.indexOf(column.key.toLowerCase());
    if (at !== -1) columnIndex[column.key] = at;
  }

  const fatalErrors: string[] = [];
  if (Object.keys(columnIndex).length === 0) {
    fatalErrors.push(
      "The first row must contain column headers (Name, Code, Brand, …).",
    );
  } else {
    const missing = IMPORT_COLUMNS.filter(
      (column) => column.required && columnIndex[column.key] === undefined,
    );
    if (missing.length > 0) {
      fatalErrors.push(
        `Missing required column(s): ${missing.map((column) => column.key).join(", ")}.`,
      );
    }
  }
  if (fatalErrors.length > 0) return { fatalErrors, rows: [] };

  const seenCodes = new Set(
    existing.map((product) => product.code.trim().toLowerCase()),
  );
  const statuses: ImportRowStatus[] = [];

  rows.slice(1).forEach((cells, offset) => {
    if (cells.every((cell) => cell.trim() === "")) return;
    const line = offset + 2;
    const value = (key: string): string => {
      const at = columnIndex[key];
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };

    const name = value("Name");
    const code = value("Code");
    const brand = value("Brand");
    const category = value("Category");
    const warehouse = value("Warehouse");
    const cost = parseNumber(value("Cost"));
    const price = parseNumber(value("Price"));
    const quantity = parseNumber(value("Quantity"));
    const typeRaw = value("Type");
    const unitRaw = value("Unit");
    const image = value("Image URL");
    const imageBgRaw = value("Thumbnail Background");

    const errors: string[] = [];
    if (name === "") errors.push("Name is required");
    if (code === "") {
      errors.push("Code is required");
    } else if (seenCodes.has(code.toLowerCase())) {
      errors.push(`Code "${code}" is already used`);
    } else {
      seenCodes.add(code.toLowerCase());
    }
    if (brand === "") errors.push("Brand is required");
    if (category === "") errors.push("Category is required");
    if (warehouse === "") errors.push("Warehouse is required");
    if (cost === null) errors.push("Cost must be a number ≥ 0");
    if (price === null) errors.push("Price must be a number ≥ 0");
    if (quantity === null) errors.push("Quantity must be a number ≥ 0");

    let type = "Single";
    if (typeRaw !== "") {
      const normalized = typeRaw.toLowerCase();
      if (normalized === "single") type = "Single";
      else if (normalized === "variable") type = "Variable";
      else errors.push("Type must be Single or Variable");
    }
    const unit = unitRaw === "" ? "pc" : unitRaw;

    let imageBg = "#f3f4f6";
    if (imageBgRaw !== "") {
      if (/^#[0-9a-f]{3,8}$/i.test(imageBgRaw)) imageBg = imageBgRaw;
      else errors.push("Thumbnail Background must be a hex color like #f3f4f6");
    }

    let product: Product | null = null;
    if (
      errors.length === 0 &&
      cost !== null &&
      price !== null &&
      quantity !== null
    ) {
      product = {
        id: code,
        name,
        code,
        cost,
        price,
        brand,
        category,
        quantity,
        unit,
        type,
        warehouse,
        image,
        imageBg,
      };
    }

    statuses.push({ line, code, name, brand, category, product, errors });
  });

  if (statuses.length === 0) {
    return {
      fatalErrors: ["No data rows found under the header row."],
      rows: [],
    };
  }
  return { fatalErrors: [], rows: statuses };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printProductsPdf(items: Product[]): void {
  const rows = items
    .map(
      (product) => `      <tr>
        <td>${escapeHtml(product.code)}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.brand)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td class="num">${product.cost.toFixed(2)}</td>
        <td class="num">${product.price.toFixed(2)}</td>
        <td class="num">${product.quantity.toFixed(2)} ${escapeHtml(product.unit)}</td>
        <td>${escapeHtml(product.type)}</td>
        <td>${escapeHtml(product.warehouse)}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Stocky — Products</title>
<style>
  body{font-family:"Plus Jakarta Sans",Arial,Helvetica,sans-serif;color:#202124;font-size:11px;margin:24px}
  h1{font-size:16px;margin:0 0 4px}
  .meta{color:#858790;font-size:10px;margin:0 0 14px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #e3e3e8;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#fafafa;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b6d76}
  td.num,th.num{text-align:right;white-space:nowrap}
  tbody tr:nth-child(even) td{background:#fbfbfc}
  @page{margin:14mm}
</style>
</head>
<body>
<h1>Products</h1>
<p class="meta">${items.length} product${items.length === 1 ? "" : "s"} — generated ${escapeHtml(new Date().toLocaleString())}</p>
<table>
  <thead>
    <tr><th>Code</th><th>Name</th><th>Brand</th><th>Category</th><th class="num">Cost</th><th class="num">Price</th><th class="num">Quantity</th><th>Type</th><th>Warehouse</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    const win = iframe.contentWindow;
    win?.focus();
    win?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 350);
}
