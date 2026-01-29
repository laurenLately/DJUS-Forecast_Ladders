export type LadderOptionsRow = {
  retailer: string;
  category: string;
  retailer_item_id: string;        // used for queries
  retailer_item_number: string;    // shown in dropdown
  dorel_item?: string;
};

export async function getOptions(): Promise<LadderOptionsRow[]> {
  const res = await fetch("/api/options");
  if (!res.ok) throw new Error(`Options failed: ${res.status}`);
  return res.json();
}

export async function getLadder(params: {
  retailer: string;
  category: string;
  retailer_item_id: string;
}): Promise<any> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`/api/ladder?${qs}`);
  if (!res.ok) throw new Error(`Ladder failed: ${res.status}`);
  return res.json();
}

