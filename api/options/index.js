const { querySnowflake } = require("../shared/snowflake");

const OPTIONS_SOURCE = "DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI";

module.exports = async function (context, req) {
  const retailer = (req.query.retailer || "").trim(); // optional
  const category = (req.query.category || "").trim(); // optional

  try {
    const selectCols = `
      RETAILER,
      ULTRAGROUP_DESC1 AS CATEGORY,
      RETAILER_ITEM_ID,
      RETAILER_ITEM_NUMBER,
      DOREL_ITEM,
      ITEM_DESCRIPTION
    `;

    let sql = `
      SELECT DISTINCT
        ${selectCols}
      FROM ${OPTIONS_SOURCE}
      WHERE ULTRAGROUP_DESC1 IS NOT NULL
        AND RETAILER_ITEM_ID IS NOT NULL
    `;

    const binds = [];

    if (retailer) {
      sql += ` AND RETAILER = ?`;
      binds.push(retailer);
    }

    if (category) {
      sql += ` AND ULTRAGROUP_DESC1 = ?`;
      binds.push(category);
    }

    sql += `
      ORDER BY
        RETAILER,
        CATEGORY,
        RETAILER_ITEM_NUMBER
    `;

    const rawRows = await querySnowflake(sql, binds);

    const rows = rawRows.map(r => ({
      retailer: r.RETAILER,
      category: r.CATEGORY,
      retailer_item_id: String(r.RETAILER_ITEM_ID),
      retailer_item_number: r.RETAILER_ITEM_NUMBER ? String(r.RETAILER_ITEM_NUMBER) : String(r.RETAILER_ITEM_ID),
      dorel_item: r.DOREL_ITEM ?? undefined,
      item_description: r.ITEM_DESCRIPTION ?? undefined
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
