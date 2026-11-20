import type { StockRow } from "@/lib/stock-data";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function dateStamp(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function downloadTextFile(
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

export function stockToCsv(rows: StockRow[]): string {
  const header = [
    "Product",
    "Code",
    "Brand",
    "Category",
    "Warehouse",
    "On Hand",
    "Reorder Point",
    "Status",
    "Unit Cost",
    "Stock Value",
    "Last Movement",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const cells = [
      row.product.name,
      row.product.code,
      row.product.brand,
      row.product.category,
      row.product.warehouse,
      String(row.onHand),
      String(row.reorderPoint),
      row.status,
      row.product.cost.toFixed(2),
      row.stockValue.toFixed(2),
      row.lastMovement
        ? `${row.lastMovement.type} ${row.lastMovement.reference} ${row.lastMovement.date}`
        : "No movement",
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadStockCsv(rows: StockRow[]): void {
  downloadTextFile(`stocky-stock-${dateStamp()}.csv`, stockToCsv(rows));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printStockPdf(rows: StockRow[]): void {
  const htmlRows = rows
    .map(
      (row) => `      <tr>
        <td>${escapeHtml(row.product.name)}</td>
        <td>${escapeHtml(row.product.code)}</td>
        <td>${escapeHtml(row.product.brand)}</td>
        <td>${escapeHtml(row.product.category)}</td>
        <td>${escapeHtml(row.product.warehouse)}</td>
        <td class="num">${row.onHand.toLocaleString()}</td>
        <td class="num">${row.reorderPoint.toLocaleString()}</td>
        <td>${escapeHtml(row.status)}</td>
        <td class="num">${row.product.cost.toFixed(2)}</td>
        <td class="num">${row.stockValue.toFixed(2)}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Stocky — Stock Management</title>
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
<h1>Stock Management</h1>
<p class="meta">${rows.length} product${rows.length === 1 ? "" : "s"} — generated ${escapeHtml(new Date().toLocaleString())}</p>
<table>
  <thead>
    <tr><th>Product</th><th>Code</th><th>Brand</th><th>Category</th><th>Warehouse</th><th class="num">On Hand</th><th class="num">Reorder At</th><th>Status</th><th class="num">Unit Cost</th><th class="num">Stock Value</th></tr>
  </thead>
  <tbody>
${htmlRows}
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
