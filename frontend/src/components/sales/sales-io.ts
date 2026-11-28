import {
  formatMoney,
  paymentStatusOf,
  soldProductNames,
  type Sale,
} from "@/lib/sales-data";
import { dueOf } from "@/lib/sales-data";

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

export function salesToCsv(items: Sale[]): string {
  const header = [
    "Date",
    "Reference",
    "Seller",
    "Customer",
    "Products",
    "Warehouse",
    "Status",
    "Payment Status",
    "Currency",
    "Total",
    "Paid",
    "Due",
    "Shipping Status",
  ];
  const lines = [header.join(",")];
  for (const sale of items) {
    const cells = [
      sale.date,
      sale.reference,
      sale.seller,
      sale.customer,
      soldProductNames(sale),
      sale.warehouse,
      sale.status,
      paymentStatusOf(sale),
      sale.currency,
      sale.total.toFixed(2),
      sale.paid.toFixed(2),
      dueOf(sale).toFixed(2),
      sale.shippingStatus,
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadSalesCsv(items: Sale[]): void {
  downloadTextFile(`stocky-sales-${dateStamp()}.csv`, salesToCsv(items));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function logoSource(logoUrl?: string): string {
  const source = logoUrl?.trim() || "/Updated logo.jpeg";
  if (/^(data:|https?:|blob:)/i.test(source)) return source;
  return new URL(source, window.location.origin).href;
}

function writePrintDocument(html: string): void {
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

const printStyles = `
  body{font-family:"Plus Jakarta Sans",Arial,Helvetica,sans-serif;color:#202124;font-size:11px;margin:24px}
  .print-head{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  .print-logo{width:42px;height:42px;object-fit:contain}
  h1{font-size:16px;margin:0}
  h2{font-size:12px;margin:16px 0 6px}
  .meta{color:#858790;font-size:10px;margin:0 0 14px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #e3e3e8;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#fafafa;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#6b6d76}
  td.num,th.num{text-align:right;white-space:nowrap}
  tbody tr:nth-child(even) td{background:#fbfbfc}
  @page{margin:14mm}
`;

export function printSalesPdf(items: Sale[], logoUrl?: string): void {
  const rows = items
    .map(
      (sale) => `      <tr>
        <td>${escapeHtml(sale.date)} 00:00</td>
        <td>${escapeHtml(sale.reference)}</td>
        <td>${escapeHtml(sale.seller)}</td>
        <td>${escapeHtml(sale.customer)}</td>
        <td>${escapeHtml(soldProductNames(sale))}</td>
        <td>${escapeHtml(sale.warehouse)}</td>
        <td>${escapeHtml(sale.status)}</td>
        <td>${escapeHtml(paymentStatusOf(sale))}</td>
        <td class="num">${sale.total.toFixed(2)}</td>
        <td class="num">${sale.paid.toFixed(2)}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>VVT-All Sales</title>
<style>${printStyles}</style>
</head>
<body>
<div class="print-head">
  <img class="print-logo" src="${escapeHtml(logoSource(logoUrl))}" alt="Logo">
  <h1>VVT-All Sales</h1>
</div>
<p class="meta">${items.length} sale${items.length === 1 ? "" : "s"} — generated ${escapeHtml(new Date().toLocaleString())}</p>
<table>
  <thead>
    <tr><th>Date</th><th>Reference</th><th>Seller</th><th>Customer</th><th>Products</th><th>Warehouse</th><th>Status</th><th>Payment Status</th><th class="num">Total</th><th class="num">Paid</th></tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>
</body>
</html>`;

  writePrintDocument(html);
}

export function printSalePdf(sale: Sale, logoUrl?: string): void {
  const productRows = (sale.items ?? [])
    .map(
      (item) => `      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.code)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPrice)}</td>
        <td class="num">${formatMoney(item.unitPrice * item.quantity)}</td>
      </tr>`,
    )
    .join("\n");
  const productTable = sale.items?.length
    ? `<h2>Products Sold</h2>
<table>
  <thead>
    <tr><th>Product</th><th>Code</th><th class="num">Quantity</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr>
  </thead>
  <tbody>
${productRows}
  </tbody>
</table>`
    : `<h2>Products Sold</h2><p class="meta">No product details recorded for this sale.</p>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>VVT-Sale ${escapeHtml(sale.reference)}</title>
<style>${printStyles}</style>
</head>
<body>
<div class="print-head">
  <img class="print-logo" src="${escapeHtml(logoSource(logoUrl))}" alt="Logo">
  <h1>VVT-Sale Details</h1>
</div>
<p class="meta">${escapeHtml(sale.reference)} — generated ${escapeHtml(new Date().toLocaleString())}</p>
<table>
  <thead>
    <tr><th>Date</th><th>Reference</th><th>Seller</th><th>Customer</th><th>Products</th><th>Warehouse</th><th>Status</th><th>Payment Status</th><th class="num">Total</th><th class="num">Paid</th></tr>
  </thead>
  <tbody>
      <tr>
        <td>${escapeHtml(sale.date)} 00:00</td>
        <td>${escapeHtml(sale.reference)}</td>
        <td>${escapeHtml(sale.seller)}</td>
        <td>${escapeHtml(sale.customer)}</td>
        <td>${escapeHtml(soldProductNames(sale))}</td>
        <td>${escapeHtml(sale.warehouse)}</td>
        <td>${escapeHtml(sale.status)}</td>
        <td>${escapeHtml(paymentStatusOf(sale))}</td>
        <td class="num">${sale.total.toFixed(2)}</td>
        <td class="num">${sale.paid.toFixed(2)}</td>
      </tr>
  </tbody>
</table>
${productTable}
</body>
</html>`;

  writePrintDocument(html);
}
