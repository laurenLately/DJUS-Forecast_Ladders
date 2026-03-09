import React, { useEffect, useMemo, useState, useRef } from "react";
import { fetchOptions, warmUpCluster } from "../lib/api";
import type { ClusterStatus } from "../lib/api";
import type { LadderOptionsRow } from "../lib/models";
import { ChevronDown, Loader2, AlertCircle, FileText, Wifi, WifiOff } from "lucide-react";

const RETAILERS = ["Amazon", "Target", "Walmart"];

type Props = {
  onSubmit: (sel: { retailer: string; category: string; retailer_item_id: string }) => void;
};

// ---------------------------------------------------------------------------
// Cluster status pill
// ---------------------------------------------------------------------------
function ClusterStatusPill({ status }: { status: ClusterStatus }) {
  const config: Record<ClusterStatus, { dot: string; label: string; animate?: string }> = {
    cold: { dot: "bg-slate-400", label: "Idle" },
    warming: { dot: "bg-amber-400", label: "Connecting\u2026", animate: "animate-pulse" },
    ready: { dot: "bg-emerald-400", label: "Connected" },
    error: { dot: "bg-red-400", label: "Offline" },
  };

  const c = config[status];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs text-white/90">
      {status === "error" ? (
        <WifiOff className="w-3 h-3 text-red-300" />
      ) : (
        <Wifi className="w-3 h-3 text-white/70" />
      )}
      <span className={`w-2 h-2 rounded-full ${c.dot} ${c.animate ?? ""}`} />
      {c.label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectionGate
// ---------------------------------------------------------------------------
export function SelectionGate({ onSubmit }: Props) {
  const [options, setOptions] = useState<LadderOptionsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus>("cold");

  const [retailer, setRetailer] = useState("");
  const [category, setCategory] = useState("");
  const [retailer_item_id, setRetailerItemId] = useState("");

  // Warm up the Databricks cluster on mount (fire-and-forget).
  const warmupFired = useRef(false);
  useEffect(() => {
    if (!warmupFired.current) {
      warmupFired.current = true;
      warmUpCluster(setClusterStatus);
    }
  }, []);

  // Fetch categories + items when retailer changes.
  useEffect(() => {
    if (!retailer) {
      setOptions([]);
      setErr(null);
      return;
    }

    setLoading(true);
    setErr(null);

    fetchOptions(retailer)
      .then((rows) => {
        if (!Array.isArray(rows)) {
          throw new Error("Unexpected response from options API");
        }
        setOptions(rows);
        // If the warm-up hasn't finished yet, mark cluster as ready since we got data.
        setClusterStatus("ready");
      })
      .catch((e) => {
        setErr(e?.message ?? "Failed to load options");
        setClusterStatus("error");
      })
      .finally(() => setLoading(false));
  }, [retailer]);

  const categories = useMemo(() => {
    if (!retailer) return [];
    return Array.from(
      new Set(options.filter((o) => o.retailer === retailer).map((o) => o.category))
    ).sort();
  }, [options, retailer]);

  const items = useMemo(() => {
    if (!retailer || !category) return [];
    return options
      .filter((o) => o.retailer === retailer && o.category === category)
      .map((o) => ({
        id: o.retailer_item_id,
        label: o.retailer_item_number || o.retailer_item_id,
      }));
  }, [options, retailer, category]);

  const canSubmit = retailer && category && retailer_item_id;

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Header */}
      <header
        className="bg-[#0e698c] px-4 py-3 flex items-center justify-between shadow-md"
        style={{ height: "64px" }}
      >
        <div className="border-b-2 border-white pb-1">
          <h1 className="text-white font-bold text-2xl tracking-wide">DOREL JUVENILE</h1>
          <p className="text-white/90 text-[10px] -mt-0.5 italic">Care for Precious Life</p>
        </div>
        <div className="flex items-center gap-4">
          <ClusterStatusPill status={clusterStatus} />
          <div className="text-white text-sm font-medium italic">Forecast & Planning</div>
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
              {/* Retailer — static, always available */}
              <div>
                <label className="block text-sm text-white mb-2">Retailer</label>
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
                    {RETAILERS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={20}
                  />
                </div>
              </div>

              {/* Category — loaded after retailer selection */}
              <div>
                <label className="block text-sm text-white mb-2">Category</label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all ${
                      !retailer || loading
                        ? "border-white/20 text-slate-400 cursor-not-allowed"
                        : "border-white/20 text-slate-900"
                    }`}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setRetailerItemId("");
                    }}
                    disabled={!retailer || loading}
                  >
                    <option value="">
                      {!retailer
                        ? "Select a retailer first"
                        : loading
                          ? "Loading categories\u2026"
                          : err
                            ? "Failed to load"
                            : "Select a category\u2026"}
                    </option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {loading && retailer ? (
                    <Loader2
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin pointer-events-none"
                      size={20}
                    />
                  ) : (
                    <ChevronDown
                      className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                        !retailer ? "text-slate-300" : "text-slate-400"
                      }`}
                      size={20}
                    />
                  )}
                </div>
                {err && retailer && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-300">
                    <AlertCircle size={14} />
                    <span>{err}</span>
                  </div>
                )}
              </div>

              {/* Item */}
              <div>
                <label className="block text-sm text-white mb-2">Item</label>
                <div className="relative">
                  <select
                    className={`w-full appearance-none border rounded-lg px-4 py-3 pr-10 bg-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all ${
                      !retailer || !category
                        ? "border-white/20 text-slate-400 cursor-not-allowed"
                        : "border-white/20 text-slate-900"
                    }`}
                    value={retailer_item_id}
                    onChange={(e) => setRetailerItemId(e.target.value)}
                    disabled={!retailer || !category}
                  >
                    <option value="">
                      {!retailer || !category ? "Select a category first" : "Select an item\u2026"}
                    </option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      !retailer || !category ? "text-slate-300" : "text-slate-400"
                    }`}
                    size={20}
                  />
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
