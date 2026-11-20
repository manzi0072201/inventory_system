"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Product } from "@/lib/products-data";
import {
  IMPORT_COLUMNS,
  downloadTextFile,
  importTemplateCsv,
  parseProductsCsv,
  type ParsedImport,
} from "./products-io";
import { useProducts } from "./products-store";

type ImportProductsProps = {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
};

export function ImportProducts({
  open,
  onClose,
  onImported,
}: ImportProductsProps) {
  const { products, addProducts } = useProducts();
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsed(null);
    setFileName(null);
    setDragOver(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        reset();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setParsed(parseProductsCsv(text, products));
    } catch {
      setParsed({ fatalErrors: ["Could not read that file."], rows: [] });
    }
  };

  const validRows = parsed
    ? parsed.rows.filter((row) => row.product !== null)
    : [];
  const invalidCount = parsed ? parsed.rows.length - validRows.length : 0;

  const confirmImport = () => {
    const incoming = validRows
      .map((row) => row.product)
      .filter((product): product is Product => product !== null);
    if (incoming.length === 0) return;
    addProducts(incoming);
    onImported(incoming.length);
    close();
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-products-title"
      >
        <div className="panel-heading">
          <h2 id="import-products-title">Import Products</h2>
        </div>
        <div className="modal-body">
          <div className="import-section">
            <p className="import-section-title">
              1 — Columns needed in your CSV
            </p>
            <p className="import-note">
              The first row of your file must contain these column headers
              (order does not matter, names are case-insensitive):
            </p>
            <div className="table-scroll import-columns-scroll">
              <table className="import-columns">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Required</th>
                    <th>Example / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_COLUMNS.map((column) => (
                    <tr key={column.key}>
                      <td className="col-key">{column.key}</td>
                      <td>{column.required ? "Yes" : "No"}</td>
                      <td>{column.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  downloadTextFile(
                    "stocky-products-template.csv",
                    importTemplateCsv(),
                  )
                }
              >
                <Icon name="table" className="w-3.5 h-3.5" />
                Download template CSV
              </button>
            </div>
          </div>

          <div className="import-section">
            <p className="import-section-title">2 — Choose your CSV file</p>
            <div
              className={`import-drop${dragOver ? " drag-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                void handleFile(event.dataTransfer.files?.[0]);
              }}
            >
              <Icon name="upload" className="w-5 h-5" strokeWidth={1.8} />
              <p>Drag &amp; drop your CSV here, or</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => fileInput.current?.click()}
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                Choose CSV file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="file-input-hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {fileName && (
                <p className="import-file-name">Selected: {fileName}</p>
              )}
            </div>
          </div>

          {parsed ? (
            <div className="import-section">
              <p className="import-section-title">3 — Preview</p>
              {parsed.fatalErrors.length > 0 ? (
                <div className="import-fatal">
                  <strong>The file could not be imported:</strong>
                  <ul>
                    {parsed.fatalErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <p className="import-summary">
                    <span className="ok">
                      {validRows.length} row
                      {validRows.length === 1 ? "" : "s"} ready to import
                    </span>
                    {invalidCount > 0 && (
                      <span className="bad">
                        {invalidCount} row
                        {invalidCount === 1 ? "" : "s"} with errors (will be
                        skipped)
                      </span>
                    )}
                  </p>
                  <div className="table-scroll import-preview-scroll">
                    <table className="import-preview">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Brand</th>
                          <th>Category</th>
                          <th>Quantity</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.rows.map((row) => (
                          <tr key={row.line}>
                            <td>{row.line}</td>
                            <td className="code-cell">
                              <Icon name="barcode" className="w-3.5 h-3.5" />
                              <span>{row.code || "—"}</span>
                            </td>
                            <td>{row.name || "—"}</td>
                            <td>{row.brand || "—"}</td>
                            <td>{row.category || "—"}</td>
                            <td className="quantity-cell">
                              {row.product
                                ? `${row.product.quantity.toFixed(2)} ${row.product.unit}`
                                : "—"}
                            </td>
                            <td>
                              {row.product ? (
                                <span className="import-status-ok">
                                  Ready to import
                                </span>
                              ) : (
                                <span className="import-row-errors">
                                  {row.errors.join(" · ")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
        <div className="modal-footer">
          <button type="button" className="ghost-button" onClick={close}>
            Cancel
          </button>
          {parsed && parsed.fatalErrors.length === 0 && validRows.length > 0 && (
            <button
              type="button"
              className="primary-button"
              onClick={confirmImport}
            >
              <Icon name="upload" className="w-3.5 h-3.5" strokeWidth={2.2} />
              Import {validRows.length} product
              {validRows.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
