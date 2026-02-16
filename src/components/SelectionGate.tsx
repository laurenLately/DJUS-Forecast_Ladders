import React, { useEffect, useMemo, useState } from "react";
import type { LadderOptionsRow } from "../lib/models";
import { ChevronDown, Loader2, AlertCircle, FileText } from "lucide-react";

type Props = {
  onSubmit: (sel: { retailer: string; category: string; retailer_item_id: string }) => void;
};

export function SelectionGate({ onSubmit }: Props) {
  const [options, setOptions] = useState<LadderOptionsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [retailer, setRetailer] = useState("");
  const [category, setCategory] = useState("");
  const [retailer_item_id, setRetailerItemId] = useState("");

  // Load options ONCE. This populates dropdowns.
  useEffect(() => {
    setLoading(true);
    setErr(null);

    fetchOptions()
      .then((rows) => setOptions(rows))
      .catch((e) => setErr(e?.message ?? "Failed to load options"))
      .finally(() => setLoading(false));
  }, []);

  const retailers = useMemo(() => {
    return Array.from(new Set(options.map(o => o.retailer))).sort();
  }, [options]);

  const categories = useMemo(() => {
    if (!retailer) return [];
    return Array.from(
      new Set(options.filter(o => o.retailer === retailer).map(o => o.category))
    ).sort();
  }, [options, retailer]);

  const items = useMemo(() => {
    if (!retailer || !category) return [];
    return options
      .filter(o => o.retailer === retailer && o.category === category)
      .map(o => ({
        id: o.retailer_item_id,
        label: o.retailer_item_number || o.retailer_item_id
      }));
  }, [options, retailer, category]);

  const canSubmit = retailer && category && retailer_item_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <div className="bg-[#006992] rounded-lg shadow-xl p-8 flex items-center gap-3">
          <Loader2 className="animate-spin text-white" size={24} />
          <span className="text-white">Loading selections…</span>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
        <div className="bg-[#006992] rounded-lg shadow-xl p-8 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-red-300 flex-shrink-0" size={24} />
            <div>
              <h2 className="text-white mb-2">Options failed to load</h2>
              <p className="text-sm text-white/90">
                {err}
              </p>
              <p className="text-xs text-white/70 mt-2">
                This usually means Snowflake credentials aren't configured in SWA yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Header */}
      <header className="bg-[#0e698c] px-4 py-3 flex items-center justify-between shadow-md" style={{ height: '64px' }}>
        <div className="border-b-2 border-white pb-1">
          <h1 className="text-white font-bold text-2xl tracking-wide">DOREL JUVENILE</h1>
          <p className="text-white/90 text-[10px] -mt-0.5 italic">Care for Precious Life</p>
        </div>
        <div className="text-white text-sm font-medium italic">
          Forecast & Planning
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-[#006992] rounded-2xl shadow-2xl overflow-hidden">
          {/* Content Header */}
          <div className="bg-[#005278] px-8 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <FileText className="text-white" size={28} />
              <h1 className="text-white">Let's Load the Ladders</h1>
            </div>
            <p className="text-sm text-white/80 mt-2">
              Start with the retailer, category, and item.
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="grid gap-6">
              {/* Retailer */}
              <div>
                <label className="block text-sm text-white mb-2">
                  Retailer
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none border border-white/20 rounded-lg px-4 py-3 pr-10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    value={retailer}
                    onChange={(e) => {
                      setRetailer(e.target.value);
                      setCategory("");
                      setRetailerItemId("");
                    }}
                  >
                    <option value="">Select a retailer…</option>
                    {retailers.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-white mb-2">
                  Category
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all ${
                      !retailer
                        ? 'border-white/20 text-slate-400 cursor-not-allowed'
                        : 'border-white/20 text-slate-900'
                    }`}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setRetailerItemId("");
                    }}
                    disabled={!retailer}
                  >
                    <option value="">
                      {retailer ? 'Select a category…' : 'Select a retailer first'}
                    </option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    !retailer ? 'text-slate-300' : 'text-slate-400'
                  }`} size={20} />
                </div>
              </div>

              {/* Item */}
              <div>
                <label className="block text-sm text-white mb-2">
                  Item
                </label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all ${
                      !retailer || !category
                        ? 'border-white/20 text-slate-400 cursor-not-allowed'
                        : 'border-white/20 text-slate-900'
                    }`}
                    value={retailer_item_id}
                    onChange={(e) => setRetailerItemId(e.target.value)}
                    disabled={!retailer || !category}
                  >
                    <option value="">
                      {!retailer || !category ? 'Select a category first' : 'Select an item…'}
                    </option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    !retailer || !category ? 'text-slate-300' : 'text-slate-400'
                  }`} size={20} />
                </div>
              </div>

              {/* Submit Button */}
              <button
                className={`mt-4 px-6 py-3 rounded-lg transition-all duration-200 ${
                  canSubmit
                    ? "bg-white text-[#006992] hover:bg-slate-100 shadow-lg hover:shadow-xl"
                    : "bg-white/30 text-white/50 cursor-not-allowed"
                }`}
                disabled={!canSubmit}
                onClick={() => onSubmit({ retailer, category, retailer_item_id })}
              >
                Open Plan
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-slate-600 text-sm">
          Business Intelligence & Analytics
        </div>
      </div>
    </div>
  );
}
