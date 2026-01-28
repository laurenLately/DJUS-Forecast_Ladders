const { querySnowflake } = require("../shared/snowflake");

// ✅ CHANGE THIS to your real view/table
const OPTIONS_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_OPTIONS_V";

module.exports = async function (context, req) {
  try {
    // Keep it simple: return the distinct combos needed for dropdowns
    const sql = `
      select distinct
        RETAILER,
        ULTRAGROUP_DESC1,
        RETAILER_ITEM_ID,
        DOREL_ITEM
      from ${OPTIONS_SOURCE}
      where RETAILER is not null
        and RETAILER_ITEM_ID is not null
    `;

    const rows = await querySnowflake(sql);
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
