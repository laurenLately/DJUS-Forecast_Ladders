const { querySnowflake } = require("../shared/snowflake");

const OPTIONS_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

module.exports = async function (context, req) {
  const retailer = (req.query.retailer || "").trim();
  const category = (req.query.category || "").trim(); // optional

  try {
    if (!retailer) {
      context.res = {
        status: 400,
        headers: { "content-type": "application/json" },
        body: { error: "Missing required query param: retailer" }
      };
      return;
    }

    // IMPORTANT:
    // If these columns don't exist in LADDER_PLAN_BI, replace them with the correct names
    // (or remove them). The required outputs are:
    // retailer, category, retailer_item_id, retailer_item_number (display)
    const selectCols = `
      RETAILER,
      ULTRAGROUP_DESC1 AS CATEGORY,
      RETAILER_ITEM_ID,
      ITEM_ID_AT_WEEK AS DOREL_ITEM
    `;

    let sql = `
      SELECT DISTINCT
        ${selectCols}
      FROM ${OPTIONS_SOURCE}
      WHERE RETAILER = ?
        AND RETAILER_ITEM_ID IS NOT NULL
    `;

    const binds = [retailer];

    if (category) {
      sql += ` AND ULTRAGROUP_DESC1 = ?`;
      binds.push(category);
    }

    sql += `
      ORDER BY
        CATEGORY,
        RETAILER_ITEM_ID
    `;

    const rawRows = await querySnowflake(sql, binds);

    // Normalize keys to match your TS type LadderOptionsRow
    const rows = rawRows.map(r => ({
      retailer: r.RETAILER,
      category: r.CATEGORY,
      retailer_item_id: String(r.RETAILER_ITEM_ID),
      dorel_item: r.DOREL_ITEM ?? undefined
    }));

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: rows
    };
  } catch (err) {
    context.log.error("options error", { retailer, category, err });
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { error: String(err?.message || err) }
    };
  }
};
