// api/ladder/index.js

import snowflake from '../_snowflake';
import { LADDER_COLUMNS } from '../../src/lib/ladderColumnConfig.js'; // If your Functions runtime can't import TS, see note below.

export default async function handler(req, res) {
  try {
    const retailer = req.query.retailer ?? null;
    const category = req.query.category ?? null;
    const retailerItemId = req.query.retailer_item_id ?? null;
    const weekFrom = req.query.week_ending_from ?? null;
    const weekTo = req.query.week_ending_to ?? null;

    // If your Functions runtime cannot import the TS config above,
    // replace `SELECT *` with an explicit list and hardcode metric_order below.
    const sql = `
      SELECT *
      FROM DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI_UI
      WHERE (? IS NULL OR RETAILER = ?)
        AND (? IS NULL OR ULTRAGROUP_DESC1 = ?)
        AND (? IS NULL OR RETAILER_ITEM_ID = ?)
        AND (? IS NULL OR WEEK_ENDING >= TO_DATE(?))
        AND (? IS NULL OR WEEK_ENDING <= TO_DATE(?))
      ORDER BY RETAILER, RETAILER_ITEM_ID, RETAIL_YEAR, RETAIL_WEEK
    `;

    const binds = [
      retailer, retailer,
      category, category,
      retailerItemId, retailerItemId,
      weekFrom, weekFrom,
      weekTo, weekTo,
    ];

    const rows = await snowflake.execute(sql, binds);

    // Metric order for the UI (use the same 29-column config)
    const metric_order = LADDER_COLUMNS.map(c => c.key);

    res.status(200).json({ rows, meta: { metric_order } });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
