import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, roundMoney, today } from "./helpers.mjs";

test("profit report returns consistent actual-cost totals", async () => {
  const year = new Date().getUTCFullYear();
  const result = await apiRequest(
    `/api/reports/profit?preset=custom&start=${year}-01-01&end=${year}-12-31`,
  );

  assert.equal(result.status, 200, result.rawText);
  assert.equal(result.data.basis, "sale_item_cost_snapshots");
  assert.ok(Array.isArray(result.data.series));

  const totals = result.data.totals;
  assert.equal(typeof totals.netSales, "number");
  assert.equal(typeof totals.cogs, "number");
  assert.equal(typeof totals.grossProfit, "number");
  assert.equal(typeof totals.netProfit, "number");
  assert.equal(totals.grossProfit, roundMoney(totals.netSales - totals.netCogs));
  assert.equal(totals.netProfit, roundMoney(totals.grossProfit - totals.expenses));
});

test("audit logs are queryable by entity after a sale lifecycle", async () => {
  const result = await apiRequest("/api/audit-logs?preset=all&limit=5");

  assert.equal(result.status, 200, result.rawText);
  assert.ok(Array.isArray(result.data.items));
  assert.ok(result.data.items.every((item) => typeof item.action === "string"));
});

test("pending sale preserves cost snapshots and return cost links", async () => {
  const [salesResult, productsResult] = await Promise.all([
    apiRequest("/api/sales?preset=all&pageSize=5"),
    apiRequest("/api/products?pageSize=50"),
  ]);

  assert.equal(salesResult.status, 200, salesResult.rawText);
  assert.equal(productsResult.status, 200, productsResult.rawText);

  assert.ok(Array.isArray(salesResult.data), "Sales list did not return an array.");
  assert.ok(Array.isArray(productsResult.data), "Products list did not return an array.");

  const existingSale = salesResult.data[0];
  const product = productsResult.data.find((item) => item.active) ?? productsResult.data[0];
  assert.ok(existingSale, "Create at least one sale before running integration tests.");
  assert.ok(product, "Create at least one product before running integration tests.");

  const unitPrice = product.sellingPrice > 0 ? product.sellingPrice : 1000;
  let saleId = null;

  try {
    const createResult = await apiRequest("/api/sales", {
      method: "POST",
      body: {
        customerId: existingSale.customerId,
        warehouseId: existingSale.warehouseId,
        date: today(),
        status: "Pending",
        currency: "RWF",
        paymentMethod: "Cash",
        paidAmount: 0,
        items: [{ productId: product.id, quantity: 1, unitPrice }],
      },
    });

    assert.equal(createResult.status, 201, createResult.rawText);
    saleId = createResult.data.id;
    const saleItem = createResult.data.items?.[0];
    assert.ok(saleItem, "Created sale did not include an item.");
    assert.equal(typeof saleItem.unitCost, "number");
    assert.equal(saleItem.unitPrice, unitPrice);

    const returnResult = await apiRequest("/api/sales/returns", {
      method: "POST",
      body: {
        saleId,
        date: today(),
        reason: "Other",
        resolution: "Replacement",
        status: "Completed",
        refundMethod: "Cash",
        restock: false,
        note: "Integration test return",
        items: [{ saleItemId: saleItem.id, quantity: 1 }],
      },
    });

    assert.equal(returnResult.status, 201, returnResult.rawText);
    const returnItem = returnResult.data.items?.[0];
    assert.ok(returnItem, "Created return did not include an item.");
    assert.equal(returnItem.saleItemId, saleItem.id);
    assert.equal(returnItem.unitCost, saleItem.unitCost);

    const detailResult = await apiRequest(`/api/sales/${saleId}`);
    assert.equal(detailResult.status, 200, detailResult.rawText);
    assert.equal(detailResult.data.items?.[0]?.unitCost, saleItem.unitCost);
  } finally {
    if (saleId) {
      const deleteResult = await apiRequest(`/api/sales/${saleId}`, {
        method: "DELETE",
      });
      assert.equal(deleteResult.status, 200, deleteResult.rawText);

      const missingResult = await apiRequest(`/api/sales/${saleId}`);
      assert.equal(missingResult.status, 404, missingResult.rawText);

      const auditResult = await apiRequest(
        `/api/audit-logs?preset=all&entityId=${saleId}&pageSize=20`,
      );
      assert.equal(auditResult.status, 200, auditResult.rawText);
      const actions = auditResult.data.items.map((item) => item.action);
      assert.ok(actions.includes("sale.create"));
      assert.ok(actions.includes("sale.delete"));
    }
  }
});
