 /**
 * MotoAI Shopping View (Phase 7.2)
 *
 * Displays the shopping cart with parts and tools after diagnosis.
 * Features:
 * - Auto-populated cart from diagnosis
 * - Remove items
 * - Update quantities
 * - Mark tools as owned
 * - Price comparison display
 * - Export as text/CSV
 * - Marketplace links (Amazon, Boodmo, Flipkart)
 * - Repair kit summary
 */
import React, { useState, useEffect } from "react";
import { ShoppingCart, Trash2, Plus, Minus, Download, Share2, ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Wrench, Package, TrendingDown } from "lucide-react";
import type { CartSummary, CartItem, RepairKit } from "../services/shoppingCartService";
import { getCartSummary, removeItem, updateQuantity, toggleOwned, generateRepairKit, exportAsText, exportAsCsv, clearCart, getTotalSavings, getMarketplaceLinks } from "../services/shoppingCartService";

interface ShoppingViewProps {
  onBack: () => void;
}

export default function ShoppingView({ onBack }: ShoppingViewProps) {
  const [summary, setSummary] = useState<CartSummary>(getCartSummary());
  const [repairKit, setRepairKit] = useState<RepairKit | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportText, setExportText] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const refresh = () => {
    setSummary(getCartSummary());
    setRepairKit(generateRepairKit());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleRemove = (itemId: string) => {
    removeItem(itemId);
    refresh();
  };

  const handleQuantity = (itemId: string, delta: number) => {
    const item = summary.items.find((i) => i.id === itemId);
    if (!item) return;
    updateQuantity(itemId, item.quantity + delta);
    refresh();
  };

  const handleToggleOwned = (itemId: string) => {
    toggleOwned(itemId);
    refresh();
  };

  const handleExportText = () => {
    setExportText(exportAsText());
    setShowExport(true);
  };

  const handleExportCsv = () => {
    const csv = exportAsCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `motoai-shopping-list-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportText).catch(() => {});
  };

  const toggleExpand = (itemId: string) => {
    const next = new Set(expandedItems);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setExpandedItems(next);
  };

  const savings = getTotalSavings();
  const marketplaceLinks = getMarketplaceLinks(summary.diagnosisContext.partName);

  if (summary.items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-6 justify-center items-center text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center mb-4">
          <ShoppingCart className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-bold text-zinc-200 font-cyber">Shopping Cart Empty</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-xs">
          Complete a diagnosis first. Required parts and tools will be added automatically.
        </p>
        <button
          id="cart-back-btn"
          onClick={onBack}
          className="mt-6 bg-zinc-900 border border-zinc-800 text-zinc-300 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-cyber cursor-pointer"
        >
          ← Back to Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-cyber text-zinc-100 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Shopping List
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {summary.diagnosisContext.partName} — {summary.itemCount} items
          </p>
        </div>
        <button
          id="clear-cart-btn"
          onClick={() => { clearCart(); refresh(); }}
          className="text-[10px] text-zinc-600 hover:text-red-400 transition-all font-mono-tech cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Savings banner */}
      {savings > 0 && (
        <div className="mx-4 mb-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold font-mono-tech">
            Save up to ₹{savings} by comparing prices
          </span>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {summary.items.map((item) => (
          <div
            key={item.id}
            className={`bg-zinc-950/80 border rounded-2xl p-3 transition-all ${
              item.alreadyOwned ? "border-zinc-800/50 opacity-60" : "border-zinc-900/90"
            }`}
          >
            {/* Item header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  item.type === "part" ? "bg-emerald-500/10 text-emerald-400" :
                  item.type === "tool" ? "bg-blue-500/10 text-blue-400" :
                  "bg-amber-500/10 text-amber-400"
                }`}>
                  {item.type === "part" ? <Package className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-zinc-200 truncate">{item.name}</h4>
                  {item.oemNumber && (
                    <p className="text-[9px] text-zinc-600 font-mono-tech mt-0.5">{item.oemNumber}</p>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{item.reason}</p>
                </div>
              </div>

              {/* Priority badge */}
              <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                item.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
                item.priority === "HIGH" ? "bg-orange-500/20 text-orange-400" :
                "bg-zinc-800 text-zinc-500"
              }`}>
                {item.priority}
              </span>
            </div>

            {/* Item controls */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                {/* Quantity controls */}
                <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5">
                  <button
                    id={`qty-minus-${item.id}`}
                    onClick={() => handleQuantity(item.id, -1)}
                    disabled={item.quantity <= 1}
                    className="p-1 rounded-md hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3 h-3 text-zinc-400" />
                  </button>
                  <span className="text-xs font-bold text-zinc-300 w-5 text-center font-mono-tech">{item.quantity}</span>
                  <button
                    id={`qty-plus-${item.id}`}
                    onClick={() => handleQuantity(item.id, 1)}
                    className="p-1 rounded-md hover:bg-zinc-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Owned toggle (for tools) */}
                {item.type === "tool" && (
                  <button
                    id={`owned-toggle-${item.id}`}
                    onClick={() => handleToggleOwned(item.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      item.alreadyOwned
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {item.alreadyOwned ? "Owned" : "Have?"}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Price */}
                <span className="text-sm font-bold font-cyber text-emerald-400">
                  ₹{item.totalPrice}
                </span>

                {/* Expand price comparison */}
                {item.priceComparison.length > 0 && (
                  <button
                    id={`expand-price-${item.id}`}
                    onClick={() => toggleExpand(item.id)}
                    className="p-1 rounded-md hover:bg-zinc-900 cursor-pointer"
                  >
                    {expandedItems.has(item.id) ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                  </button>
                )}

                {/* Remove */}
                <button
                  id={`remove-item-${item.id}`}
                  onClick={() => handleRemove(item.id)}
                  className="p-1 rounded-md hover:bg-red-950/30 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Price comparison (expanded) */}
            {expandedItems.has(item.id) && item.priceComparison.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-900 space-y-1">
                {item.priceComparison.map((pc, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">{pc.source}</span>
                      {pc.deliveryEstimate && (
                        <span className="text-zinc-600">({pc.deliveryEstimate})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono-tech text-zinc-300">₹{pc.price}</span>
                      {pc.url && (
                        <a
                          href={pc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer: totals + actions */}
      <div className="border-t border-zinc-900 bg-zinc-950 px-4 py-3 space-y-2">
        {/* Totals */}
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <p className="text-zinc-500">Parts: <span className="text-zinc-300 font-bold">₹{summary.totalPartsCost}</span></p>
            <p className="text-zinc-500">Tools: <span className="text-zinc-300 font-bold">₹{summary.totalToolsCost}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-mono-tech">TOTAL</p>
            <p className="text-xl font-black font-cyber text-emerald-400">₹{summary.grandTotal}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="export-text-btn"
            onClick={handleExportText}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 py-2.5 rounded-xl text-[10px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer font-cyber"
          >
            <Download className="w-3.5 h-3.5" />
            Export List
          </button>
          <button
            id="export-csv-btn"
            onClick={handleExportCsv}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 py-2.5 rounded-xl text-[10px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer font-cyber"
          >
            <Share2 className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Marketplace links */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {marketplaceLinks.map((mp, i) => (
            <a
              key={i}
              href={mp.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-zinc-600 hover:text-emerald-400 transition-all font-mono-tech uppercase tracking-wider"
            >
              {mp.name} ↗
            </a>
          ))}
        </div>

        {/* Repair kit summary */}
        {repairKit && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${repairKit.isComplete ? "text-emerald-400" : "text-amber-400"}`} />
              <div>
                <p className="text-[10px] font-bold text-zinc-300">{repairKit.name}</p>
                <p className="text-[9px] text-zinc-500">
                  {repairKit.isComplete ? "Complete — all items included" : `${repairKit.missingItems.length} items missing`}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-cyber text-emerald-400">₹{repairKit.totalPrice}</span>
          </div>
        )}
      </div>

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 max-w-sm w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold font-cyber text-zinc-100">Shopping List</h3>
              <button
                id="close-export-btn"
                onClick={() => setShowExport(false)}
                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={exportText}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl p-3 text-[10px] font-mono leading-relaxed resize-none focus:outline-none min-h-[300px]"
            />
            <button
              id="copy-export-btn"
              onClick={handleCopyExport}
              className="mt-3 w-full bg-emerald-500 text-zinc-950 py-2.5 rounded-xl text-xs font-bold font-cyber tracking-wide uppercase cursor-pointer"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}