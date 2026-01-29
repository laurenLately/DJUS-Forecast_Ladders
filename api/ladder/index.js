const { querySnowflake } = require("../shared/snowflake");

const LADDER_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

function toDateString(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  // handles "YYYY-MM-DD", "YYYY-MM-DDTHH:MM:SS", etc.const { querySnowflake } = require("../shared/snowflake");

const LADDER_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

module.exports = async function (context, req) {
  const retailer = (req.query.retailer || "").trim();
  const category = (req.query.category || "").trim();
  const retailerItemId = (req.query.retailer_item_id || "").trim();

  if (!retailer || !category || !retailerItemId) {
    context.res = {
      status: 400,
      body: { error: "Missing required query params" }
    };
    return;
  }

  try {
    const sql = `
      SELECT
        WEEK_NUM,
        WEEK_END,
        ACTUAL_UNITS_LY,
        ACTUAL_UNITS,
        WEEKLY_FORECAST_UNITS,
        PLAN_UNITS,
        SUGGESTED_PLAN_UNITS,
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
      FROM ${LADDER_SOURCE}
      WHERE RETAILER = ?
        AND ULTRAGROUP_DESC1 = ?
        AND RETAILER_ITEM_ID = ?
      ORDER BY WEEK_NUM
    `;

    const rawRows = await querySnowflake(sql, [
      retailer,
      category,
      retailerItemId
    ]);

    const meta = {
      retailer,
      category,
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
      ]
    };

    const rows = rawRows.map(r => ({
      week_num: Number(r.WEEK_NUM),
      week_end: r.WEEK_END,
      year: Number(String(r.WEEK_END).slice(0, 4)),
      metrics: {
        ACTUAL_UNITS_LY: r.ACTUAL_UNITS_LY,
        ACTUAL_UNITS: r.ACTUAL_UNITS,
        WEEKLY_FORECAST_UNITS: r.WEEKLY_FORECAST_UNITS,
        PLAN_UNITS: r.PLAN_UNITS,
        SUGGESTED_PLAN_UNITS: r.SUGGESTED_PLAN_UNITS,
        ACTUAL_DOLLARS_LY: r.ACTUAL_DOLLARS_LY,
        ACTUAL_DOLLARS: r.ACTUAL_DOLLARS,
        FORECAST_DOLLARS: r.FORECAST_DOLLARS,
        ACTUAL_UNIT_INV_LY: r.ACTUAL_UNIT_INV_LY,
        ACTUAL_UNIT_INV: r.ACTUAL_UNIT_INV,
        FORECAST_UNIT_INVENTORY: r.FORECAST_UNIT_INVENTORY,
        PLAN_UNIT_INVENTORY: r.PLAN_UNIT_INVENTORY,
        SUGGESTED_PLAN_UNIT_INVENTORY: r.SUGGESTED_PLAN_UNIT_INVENTORY,
        FORECAST_UNIT_RECEIPTS: r.FORECAST_UNIT_RECEIPTS,
        PLAN_UNIT_RECEIPTS: r.PLAN_UNIT_RECEIPTS,
        SUGGESTED_PLAN_UNIT_RECEIPTS: r.SUGGESTED_PLAN_UNIT_RECEIPTS,
        WOS: r.WOS
      }
    }));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { meta, rows }
    };
  } catch (err) {
    context.log.error("ladder error", {
      retailer,
      category,
      retailerItemId,
      message: err?.message,
      stack: err?.stack
    });

    context.res = {
      status: 500,
      body: { error: err?.message || "Internal server error" }
    };
  }
};

  return String(value).slice(0, 10);
}

module.exports = async function (context, req) {
  const retailer = (req.query.retailer || "").trim();
  const category = (req.query.category || "").trim();
  const retailerItemId = (req.query.retailer_item_id || "").trim();

  try {
    if (!retailer || !category || !retailerItemId) {
      context.res = {
        status: 400,
        headers: { "content-type": "application/json" },
        body: { error: "Missing required query params: retailer, category, retailer_item_id" }
      };
      return;
    }

    const sql = `
      SELECT
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
      FROM ${LADDER_SOURCE}
      WHERE RETAILER = ?
        AND ULTRAGROUP_DESC1 = ?
        AND RETAILER_ITEM_ID = ?
      ORDER BY WEEK_NUM
    `;

    const rawRows = await querySnowflake(sql, [retailer, category, retailerItemId]);

    const meta = {
      retailer,
      category,
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
        WEEKLY_FORECAST_UNITS: "Weekly Forecast",
        PLAN_UNITS: "Plan Units",
        SUGGESTED_PLAN_UNITS: "Suggested Plan Units",

        ACTUAL_DOLLARS_LY: "Actual Dollars LY",
        ACTUAL_DOLLARS: "Actual Dollars",
        FORECAST_DOLLARS: "Forecast Dollars",

        ACTUAL_UNIT_INV_LY: "Actual Unit Inv LY",
        ACTUAL_UNIT_INV: "Actual Unit Inv",
        FORECAST_UNIT_INVENTORY: "Forecast Unit Inv",
        PLAN_UNIT_INVENTORY: "Plan Unit Inv",
        SUGGESTED_PLAN_UNIT_INVENTORY: "Suggested Unit Inv",

        FORECAST_UNIT_RECEIPTS: "Forecast Receipts Units",
        PLAN_UNIT_RECEIPTS: "Plan Receipts Units",
        SUGGESTED_PLAN_UNIT_RECEIPTS: "Suggested Receipts Units",

        WOS: "WOS"
      }
    };

    const rows = rawRows.map(r => {
      const weekEnd = toDateString(r.WEEK_END);
      return {
        week_end: weekEnd,
        week_num: Number(r.WEEK_NUM),
        year: weekEnd ? Number(weekEnd.slice(0, 4)) : 0,
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
      };
    });

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { meta, rows }
    };
  } catch (err) {
    context.log.error("ladder error", { retailer, category, retailerItemId, err });
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { error: String(err?.message || err) }
    };
  }
};
