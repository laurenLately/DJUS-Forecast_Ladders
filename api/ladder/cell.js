// api/ladder/cell.js

import snowflake from '../_snowflake';

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const retailer = body.retailer;
    const retailer_item_id = body.retailer_item_id;
    const item_id_at_week = body.item_id_at_week ?? null;
    const week_ending = body.week_ending;
    const field = body.field; // PLAN_UNITS | SUGGESTED_PLAN_UNITS
    const value = body.value; // number | null
    const updated_by = body.updated_by ?? 'svc_automation';

    if (!retailer || !retailer_item_id || !week_ending || !field) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (field !== 'PLAN_UNITS' && field !== 'SUGGESTED_PLAN_UNITS') {
      return res.status(400).json({ error: 'Invalid field' });
    }

   
    await snowflake.execute(
      `CALL DJUS_ML_SANDBOX.PUBLIC.SP_LADDER_AUTOSAVE_CELL_PY(?, ?, ?, ?, ?, ?, ?)`,
      [retailer, retailer_item_id, item_id_at_week, week_ending, field, value, updated_by]
    );

   
    const sliceSql = `
      SELECT *
      FROM DJUS_ML_SANDBOX.PUBLIC.LADDER_PLAN_BI_UI
      WHERE RETAILER = ?
        AND RETAILER_ITEM_ID = ?
        AND WEEK_ENDING BETWEEN DATEADD(day, -14, TO_DATE(?)) AND DATEADD(day, 84, TO_DATE(?))
      ORDER BY RETAIL_YEAR, RETAIL_WEEK
    `;
    const rows = await snowflake.execute(sliceSql, [retailer, retailer_item_id, week_ending, week_ending]);

    res.status(200).json({
      rows,
      meta: {
        metric_order: null, // UI already has column contract; optional to include
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
