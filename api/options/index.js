const { querySnowflake } = require("../shared/snowflake");

const OPTIONS_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.TR3_RETAIL_ITEM";

module.exports = async function (context, req) {
  try {
    const sql = `
      SELECT DISTINCT
        RETAILER,
        ULTRAGROUP_DESC1 AS CATEGORY,
        RETAILER_ITEM_ID,
        ITEM_ID_AT_WEEK AS DOREL_ITEM
      FROM ${OPTIONS_SOURCE}
      WHERE RETAILER IS NOT NULL
        AND RETAILER_ITEM_ID IS NOT NULL
      ORDER BY RETAILER, CATEGORY, RETAILER_ITEM_ID
    `;

    const rows = await querySnowflake(sql);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: rows
    };
  } catch (err) {
    context.log.error("options error", {
      message: err?.message,
      stack: err?.stack
    });

    context.res = {
      status: 500,
      body: { error: err?.message || "Internal server error" }
    };
  }
};
