"use client";

import { Icon } from "@/components/ui/icon";

const pageSizeOptions = [10, 25, 50, 100];

export type PageEntry = number | "gap";

export function getPageList(current: number, last: number): PageEntry[] {
  if (last <= 1) return [1];
  const wanted = new Set<number>([1, last]);
  for (let i = 2; i <= Math.min(5, last - 1); i += 1) wanted.add(i);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= last) wanted.add(i);
  }
  const entries = [...wanted].sort((a, b) => a - b);
  const list: PageEntry[] = [];
  let previous = 0;
  for (const entry of entries) {
    if (previous && entry - previous > 1) list.push("gap");
    list.push(entry);
    previous = entry;
  }
  return list;
}

type ProductsPaginationProps = {
  totalCount: number;
  currentPage: number;
  lastPage: number;
  pageList: PageEntry[];
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
};

export function ProductsPagination({
  totalCount,
  currentPage,
  lastPage,
  pageList,
  pageSize,
  onPage,
  onPageSize,
}: ProductsPaginationProps) {
  return (
    <div className="table-footer">
      <span className="total-count">{totalCount}</span>
      <div className="page-buttons">
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPage(currentPage - 1)}
        >
          <Icon name="arrowLeft" className="w-3.5 h-3.5" />
        </button>
        {pageList.map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="page-gap">
              …
            </span>
          ) : (
            <button
              type="button"
              key={entry}
              className={entry === currentPage ? "active" : ""}
              onClick={() => onPage(entry)}
            >
              {entry}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage === lastPage}
          onClick={() => onPage(currentPage + 1)}
        >
          <Icon name="arrowRight" className="w-3.5 h-3.5" />
        </button>
      </div>
      <select
        className="page-size"
        value={pageSize}
        onChange={(event) => {
          onPageSize(Number(event.target.value));
        }}
        aria-label="Rows per page"
      >
        {pageSizeOptions.map((size) => (
          <option key={size}>{size}</option>
        ))}
      </select>
    </div>
  );
}
