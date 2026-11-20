import type { Purchase } from "@/lib/purchases-data";
import { dueOf, paymentStatusOf } from "@/lib/purchases-data";

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

export function purchasesToCsv(items: Purchase[]): string {
  const header = [
    "Date",
    "Reference",
    "Buyer",
    "Supplier",
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
  for (const purchase of items) {
    const cells = [
      purchase.date,
      purchase.reference,
      purchase.buyer,
      purchase.supplier,
      purchase.warehouse,
      purchase.status,
      paymentStatusOf(purchase),
      purchase.currency,
      purchase.total.toFixed(2),
      purchase.paid.toFixed(2),
      dueOf(purchase).toFixed(2),
      purchase.shippingStatus,
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadPurchasesCsv(items: Purchase[]): void {
  downloadTextFile(`stocky-purchases-${dateStamp()}.csv`, purchasesToCsv(items));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function printPurchasesPdf(items: Purchase[]): void {
  const rows = items
    .map(
      (purchase) => `      <tr>
        <td>${escapeHtml(purchase.date)} 00:00</td>
        <td>${escapeHtml(purchase.reference)}</td>
        <td>${escapeHtml(purchase.buyer)}</td>
        <td>${escapeHtml(purchase.supplier)}</td>
        <td>${escapeHtml(purchase.warehouse)}</td>
        <td>${escapeHtml(purchase.status)}</td>
        <td>${escapeHtml(paymentStatusOf(purchase))}</td>
        <td class="num">${purchase.total.toFixed(2)}</td>
        <td class="num">${purchase.paid.toFixed(2)}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Stocky — All Purchases</title>
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
<h1>All Purchases</h1>
<p class="meta">${items.length} purchase${items.length === 1 ? "" : "s"} — generated ${escapeHtml(new Date().toLocaleString())}</p>
<table>
  <thead>
    <tr><th>Date</th><th>Reference</th><th>Buyer</th><th>Supplier</th><th>Warehouse</th><th>Status</th><th>Payment Status</th><th class="num">Total</th><th class="num">Paid</th></tr>
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
