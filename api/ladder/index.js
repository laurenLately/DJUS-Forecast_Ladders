const { querySnowflake } = require("../shared/snowflake");


const LADDER_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

module.exports = async function (context, req) {
  try {
    const retailer = (req.query.retailer || "").trim();
    const retailerItemId = (req.query.retailer_item_id || "").trim(); // ✅ matches SalesLadder.tsx

    if (!retailer || !retailerItemId) {
      context.res = {
        status: 400,
        headers: { "content-type": "application/json" },
        body: { error: "Missing required query params: retailer, retailer_item_id" }
      };
      return;
    }

    // Keep binds to avoid injection + keep plan cache stable
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

    const rows = await querySnowflake(sql, [retailer, retailerItemId]);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { rows }
    };
  } catch (err) {
    context.log.error(err);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { error: String(err?.message || err) }
    };
  }
};
