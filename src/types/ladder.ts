// src/types/ladder.ts
 

export type LadderOption = {
  retailer: string;
  category: string;
  retailer_item_id: string;
  dorel_item?: string;
};
 
// What Snowflake/API tends to return (uppercase keys)
export type LadderOptionApiRow = {
  RETAILER: string;
  CATEGORY: string;
  RETAILER_ITEM_ID: string;
  DOREL_ITEM?: string;
};
 
// API might return either an array of rows OR { options: rows }
export type LadderOptionsResponse =
  | LadderOptionApiRow[]
  | { options: LadderOptionApiRow[] };
