import type { LadderOptionsRow, LadderResponse } from "./models";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function fetchOptions(): Promise<LadderOptionsRow[]> {
  const res = await fetch("/api/options");
  return asJson<LadderOptionsRow[]>(res);
}

export async function fetchLadder(params: {
  retailer: string;
  category: string;
  retailer_item_id: string;
}): Promise<LadderResponse> {
  const qs = new URLSearchParams(params as any).toString();
  const res = await fetch(`/api/ladder?${qs}`);
  return asJson<LadderResponse>(res);
}
