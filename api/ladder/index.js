const { querySnowflake } = require("../shared/snowflake");

const LADDER_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

module.exports = async function (context, req) {
  // Define outside try so we can reference in catch safely
  const retailer = (req.query.retailer || "").trim();
  const retailerItemId = (req.query.retailer_item_id || "").trim();

  try {
    if (!retailer || !retailerItemId) {
      context.res = {
        status: 400,
        headers: { "content-type": "application/json" },
        body: { error: "Missing required query params: retailer, retailer_item_id" }
      };
      return;
    }

    const sql = `
      select
        WEEK_NUM,
        WEEK_END,
        ACTUAL_UNITS_LY,
        ACTUAL_UNITS,
        WEEKLY_FORECAST_UNITS,
        PLAN_UNITS,
        SUGGESTED_PLAN_UNITS,
        ITEM_AMOUNT,
        ACTUAL_DOLLARS_LY,
        ACTUAL_DOLLARS,
        FORECAST_DOLLARS,
        ACTUAL_UNIT_INV_LY,
        ACTUAL_UNIT_INV,
        FORECAST_UNIT_INVENTORY,
        PLAN_UNIT_INVENTORY,
        SUGGESTED_PLAN_UNIT_INVENTORY,
        FORECAST_UNIT_RECEIPTS,
        PLAN_UNIT_RECEIPTS,
        SUGGESTED_PLAN_UNIT_RECEIPTS,
        WOS
      from ${LADDER_SOURCE}
      where RETAILER = ?
        and RETAILER_ITEM_ID = ?
      order by WEEK_NUM
    `;

    const rawRows = await querySnowflake(sql, [retailer, retailerItemId]);

    // Contract-driving metadata
    const meta = {
      retailer,
      retailer_item_id: retailerItemId,
      timezone: "America/Los_Angeles",
      currency: "USD",
      metric_order: [
        "ACTUAL_UNITS_LY",
        "ACTUAL_UNITS",
        "WEEKLY_FORECAST_UNITS",
        "PLAN_UNITS",
        "SUGGESTED_PLAN_UNITS",

        "ACTUAL_DOLLARS_LY",
        "ACTUAL_DOLLARS",
        "FORECAST_DOLLARS",

        "ACTUAL_UNIT_INV_LY",
        "ACTUAL_UNIT_INV",
        "FORECAST_UNIT_INVENTORY",
        "PLAN_UNIT_INVENTORY",
        "SUGGESTED_PLAN_UNIT_INVENTORY",

        "FORECAST_UNIT_RECEIPTS",
        "PLAN_UNIT_RECEIPTS",
        "SUGGESTED_PLAN_UNIT_RECEIPTS",

        "WOS"
      ],
      metric_labels: {
        ACTUAL_UNITS_LY: "Actual Units LY",
        ACTUAL_UNITS: "Actual Units",
        WEEKLY_FORECAST_UNITS: "Retailer Forecast",
        PLAN_UNITS: "Plan Units",
        SUGGESTED_PLAN_UNITS: "Suggested Plan",

        ACTUAL_DOLLARS_LY: "Actual Dollars LY",
        ACTUAL_DOLLARS: "Actual Dollars",
        FORECAST_DOLLARS: "Forecast Dollars",

        ACTUAL_UNIT_INV_LY: "Unit Inv LY",
        ACTUAL_UNIT_INV: "Unit Inv",
        FORECAST_UNIT_INVENTORY: "Forecast Unit Inv",
        PLAN_UNIT_INVENTORY: "Plan Unit Inv",
        SUGGESTED_PLAN_UNIT_INVENTORY: "Suggested Unit Inv",

        FORECAST_UNIT_RECEIPTS: "Forecast Receipts",
        PLAN_UNIT_RECEIPTS: "Plan Receipts",
        SUGGESTED_PLAN_UNIT_RECEIPTS: "Suggested Receipts",

        WOS: "WOS"
      }
    };

    // Normalize rows to LadderResponse shape
    const rows = rawRows.map(r => ({
      week_num: Number(r.WEEK_NUM),
      week_end: r.WEEK_END, // should already be YYYY-MM-DD; if it’s a Date, stringify it
      year: Number(String(r.WEEK_END).slice(0, 4)),
      metrics: {
        ACTUAL_UNITS_LY: r.ACTUAL_UNITS_LY ?? null,
        ACTUAL_UNITS: r.ACTUAL_UNITS ?? null,
        WEEKLY_FORECAST_UNITS: r.WEEKLY_FORECAST_UNITS ?? null,
        PLAN_UNITS: r.PLAN_UNITS ?? null,
        SUGGESTED_PLAN_UNITS: r.SUGGESTED_PLAN_UNITS ?? null,

        ACTUAL_DOLLARS_LY: r.ACTUAL_DOLLARS_LY ?? null,
        ACTUAL_DOLLARS: r.ACTUAL_DOLLARS ?? null,
        FORECAST_DOLLARS: r.FORECAST_DOLLARS ?? null,

        ACTUAL_UNIT_INV_LY: r.ACTUAL_UNIT_INV_LY ?? null,
        ACTUAL_UNIT_INV: r.ACTUAL_UNIT_INV ?? null,
        FORECAST_UNIT_INVENTORY: r.FORECAST_UNIT_INVENTORY ?? null,
        PLAN_UNIT_INVENTORY: r.PLAN_UNIT_INVENTORY ?? null,
        SUGGESTED_PLAN_UNIT_INVENTORY: r.SUGGESTED_PLAN_UNIT_INVENTORY ?? null,

        FORECAST_UNIT_RECEIPTS: r.FORECAST_UNIT_RECEIPTS ?? null,
        PLAN_UNIT_RECEIPTS: r.PLAN_UNIT_RECEIPTS ?? null,
        SUGGESTED_PLAN_UNIT_RECEIPTS: r.SUGGESTED_PLAN_UNIT_RECEIPTS ?? null,

        WOS: r.WOS ?? null
      }
    }));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { meta, rows }
    };
  } catch (err) {
    context.log.error("ladder error", { retailer, retailerItemId, err });

    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { error: String(err?.message || err) }
    };
  }
};
