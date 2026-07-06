/**
 * MotoAI Shopping Cart Service (Phase 7.2)
 *
 * Manages the shopping cart for parts and tools after diagnosis.
 * Features:
 * - Auto-add parts from PartsRecommendation
 * - Remove items
 * - Update quantities
 * - Compare prices (multiple sources)
 * - Generate repair kit bundles
 * - Export order as text/CSV
 * - Prepare for Amazon/Boodmo marketplace integration
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { PartsRecommendation, RecommendedPart, RecommendedTool } from "./partsRecommendationService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  /** Unique item ID */
  id: string;
  /** Item type */
  type: "part" | "tool" | "consumable";
  /** Part/tool ID */
  sourceId: string;
  /** Display name */
  name: string;
  /** OEM part number (for parts) */
  oemNumber?: string;
  /** Quantity in cart */
  quantity: number;
  /** Unit price in INR */
  unitPrice: number;
  /** Total price (quantity × unitPrice) */
  totalPrice: number;
  /** Priority level */
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Whether the item is mandatory */
  isRequired: boolean;
  /** Reason this item is needed */
  reason: string;
  /** Price comparison from different sources */
  priceComparison: PriceSource[];
  /** Whether the user already owns this (for tools) */
  alreadyOwned: boolean;
}

export interface PriceSource {
  /** Source name (e.g. "Amazon", "Boodmo", "Local Shop") */
  source: string;
  /** Price from this source */
  price: number;
  /** URL to purchase (if available) */
  url?: string;
  /** Estimated delivery time */
  deliveryEstimate?: string;
}

export interface CartSummary {
  /** All items in the cart */
  items: CartItem[];
  /** Total cost for parts */
  totalPartsCost: number;
  /** Total cost for tools (not owned) */
  totalToolsCost: number;
  /** Total cost for consumables */
  totalConsumablesCost: number;
  /** Grand total */
  grandTotal: number;
  /** Number of items */
  itemCount: number;
  /** Whether the cart is ready for export */
  isReady: boolean;
  /** The diagnosis context */
  diagnosisContext: {
    partName: string;
    confidence: number;
    priority: string;
  };
}

export interface RepairKit {
  /** Kit name */
  name: string;
  /** Kit description */
  description: string;
  /** Items included in the kit */
  items: CartItem[];
  /** Total kit price */
  totalPrice: number;
  /** Whether this kit includes everything needed */
  isComplete: boolean;
  /** Missing items if not complete */
  missingItems: string[];
}

export interface MarketplaceLink {
  /** Marketplace name (e.g. "Amazon", "Boodmo") */
  name: string;
  /** Base URL for search */
  baseUrl: string;
  /** Whether this marketplace is active */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Marketplace Configuration
// ---------------------------------------------------------------------------

const MARKETPLACES: MarketplaceLink[] = [
  { name: "Amazon India", baseUrl: "https://www.amazon.in/s?k=", isActive: true },
  { name: "Boodmo", baseUrl: "https://boodmo.com/catalog/?q=", isActive: true },
  { name: "ShopClues", baseUrl: "https://www.shopclues.com/search?q=", isActive: false },
  { name: "Flipkart", baseUrl: "https://www.flipkart.com/search?q=", isActive: true },
];

// ---------------------------------------------------------------------------
// Cart State (in-memory singleton)
// ---------------------------------------------------------------------------

let _cartItems: Map<string, CartItem> = new Map();
let _diagnosisContext: CartSummary["diagnosisContext"] = {
  partName: "",
  confidence: 0,
  priority: "LOW",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initializes the shopping cart from a PartsRecommendation.
 * Automatically adds all required parts and tools.
 *
 * @param recommendation - The PartsRecommendation from the recommendation service
 */
export function initCartFromRecommendation(recommendation: PartsRecommendation): void {
  _cartItems.clear();

  _diagnosisContext = {
    partName: recommendation.diagnosedPartName,
    confidence: recommendation.diagnosisConfidence,
    priority: recommendation.overallPriority,
  };

  // Add all required parts
  for (const part of recommendation.requiredParts) {
    addPartToCart(part);
  }

  // Add tools that are not commonly owned
  for (const tool of recommendation.requiredTools) {
    if (!tool.commonlyOwned) {
      addToolToCart(tool);
    }
  }
}

/**
 * Adds a single part to the cart.
 *
 * @param part - The RecommendedPart to add
 */
export function addPartToCart(part: RecommendedPart): void {
  const id = `part_${part.partId}`;

  if (_cartItems.has(id)) {
    // Update quantity
    const existing = _cartItems.get(id)!;
    existing.quantity += part.quantity;
    existing.totalPrice = existing.quantity * existing.unitPrice;
    return;
  }

  // Generate price comparisons
  const priceComparison = generatePriceComparisons(part.partName, part.cost);

  const item: CartItem = {
    id,
    type: "part",
    sourceId: part.partId,
    name: part.partName,
    oemNumber: part.oemNumber,
    quantity: part.quantity,
    unitPrice: part.cost,
    totalPrice: part.cost * part.quantity,
    priority: part.priority,
    isRequired: part.mustReplace,
    reason: part.reason,
    priceComparison,
    alreadyOwned: false,
  };

  _cartItems.set(id, item);
}

/**
 * Adds a single tool to the cart.
 *
 * @param tool - The RecommendedTool to add
 */
export function addToolToCart(tool: RecommendedTool): void {
  const id = `tool_${tool.toolId}`;

  if (_cartItems.has(id)) return;

  const priceComparison = generatePriceComparisons(tool.toolName, tool.estimatedCost);

  const item: CartItem = {
    id,
    type: "tool",
    sourceId: tool.toolId,
    name: tool.toolName,
    quantity: 1,
    unitPrice: tool.estimatedCost,
    totalPrice: tool.estimatedCost,
    priority: "MEDIUM",
    isRequired: !tool.commonlyOwned,
    reason: `Required for repair. ${tool.description}`,
    priceComparison,
    alreadyOwned: tool.commonlyOwned,
  };

  _cartItems.set(id, item);
}

/**
 * Adds a custom item to the cart (user-added).
 *
 * @param name - Item name
 * @param price - Unit price
 * @param quantity - Quantity
 * @param type - Item type
 */
export function addCustomItem(
  name: string,
  price: number,
  quantity: number = 1,
  type: CartItem["type"] = "part",
): void {
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  const item: CartItem = {
    id,
    type,
    sourceId: id,
    name,
    quantity,
    unitPrice: price,
    totalPrice: price * quantity,
    priority: "LOW",
    isRequired: false,
    reason: "User-added item",
    priceComparison: [],
    alreadyOwned: false,
  };

  _cartItems.set(id, item);
}

/**
 * Removes an item from the cart by ID.
 *
 * @param itemId - The cart item ID
 */
export function removeItem(itemId: string): void {
  _cartItems.delete(itemId);
}

/**
 * Updates the quantity of a cart item.
 *
 * @param itemId - The cart item ID
 * @param quantity - New quantity
 */
export function updateQuantity(itemId: string, quantity: number): void {
  const item = _cartItems.get(itemId);
  if (!item) return;

  const clampedQuantity = Math.max(0, Math.min(99, quantity));
  if (clampedQuantity === 0) {
    _cartItems.delete(itemId);
    return;
  }

  item.quantity = clampedQuantity;
  item.totalPrice = clampedQuantity * item.unitPrice;
}

/**
 * Toggles the "already owned" status for a tool.
 *
 * @param itemId - The cart item ID
 */
export function toggleOwned(itemId: string): void {
  const item = _cartItems.get(itemId);
  if (!item) return;
  item.alreadyOwned = !item.alreadyOwned;
}

/**
 * Returns the current cart summary.
 */
export function getCartSummary(): CartSummary {
  const items = Array.from(_cartItems.values());
  let totalPartsCost = 0;
  let totalToolsCost = 0;
  let totalConsumablesCost = 0;

  for (const item of items) {
    if (item.alreadyOwned) continue; // Skip owned items in cost calculation

    switch (item.type) {
      case "part":
        totalPartsCost += item.totalPrice;
        break;
      case "tool":
        totalToolsCost += item.totalPrice;
        break;
      case "consumable":
        totalConsumablesCost += item.totalPrice;
        break;
    }
  }

  return {
    items,
    totalPartsCost,
    totalToolsCost,
    totalConsumablesCost,
    grandTotal: totalPartsCost + totalToolsCost + totalConsumablesCost,
    itemCount: items.length,
    isReady: items.length > 0,
    diagnosisContext: _diagnosisContext,
  };
}

/**
 * Generates a repair kit bundle from the current cart.
 * Groups items into a single "kit" with complete/incomplete status.
 *
 * @returns RepairKit with all items
 */
export function generateRepairKit(): RepairKit {
  const items = Array.from(_cartItems.values());
  const criticalItems = items.filter((i) => i.priority === "CRITICAL" || i.priority === "HIGH");
  const missingCritical = criticalItems.filter((i) => !_cartItems.has(i.id));

  const totalPrice = items.reduce((sum, i) => sum + (i.alreadyOwned ? 0 : i.totalPrice), 0);

  return {
    name: `${_diagnosisContext.partName} Repair Kit`,
    description: `Complete repair kit for ${_diagnosisContext.partName}. Confidence: ${_diagnosisContext.confidence}%. Priority: ${_diagnosisContext.priority}.`,
    items,
    totalPrice,
    isComplete: missingCritical.length === 0,
    missingItems: missingCritical.map((i) => i.name),
  };
}

/**
 * Clears the entire cart.
 */
export function clearCart(): void {
  _cartItems.clear();
}

/**
 * Exports the cart as a plain text shopping list.
 *
 * @returns Formatted text string
 */
export function exportAsText(): string {
  const summary = getCartSummary();
  const lines: string[] = [];
  const divider = "─".repeat(50);

  lines.push("╔══════════════════════════════════════════════════╗");
  lines.push("║         MotoAI — Shopping List                  ║");
  lines.push("╚══════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`Diagnosis: ${summary.diagnosisContext.partName}`);
  lines.push(`Confidence: ${summary.diagnosisContext.confidence}%`);
  lines.push(`Priority: ${summary.diagnosisContext.priority}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(divider);
  lines.push("  REQUIRED PARTS");
  lines.push(divider);

  for (const item of summary.items) {
    if (item.type !== "part") continue;
    const owned = item.alreadyOwned ? " [OWNED]" : "";
    const oem = item.oemNumber ? ` (${item.oemNumber})` : "";
    lines.push(`  ${item.name}${oem}${owned}`);
    lines.push(`    Qty: ${item.quantity} × ₹${item.unitPrice} = ₹${item.totalPrice}`);
    lines.push(`    Priority: ${item.priority}`);
    if (item.reason) lines.push(`    Reason: ${item.reason}`);
    lines.push("");
  }

  lines.push(divider);
  lines.push("  REQUIRED TOOLS");
  lines.push(divider);

  for (const item of summary.items) {
    if (item.type !== "tool") continue;
    const owned = item.alreadyOwned ? " [OWNED]" : "";
    lines.push(`  ${item.name}${owned}`);
    lines.push(`    ₹${item.unitPrice}`);
    lines.push("");
  }

  lines.push(divider);
  lines.push(`  TOTAL: ₹${summary.grandTotal}`);
  lines.push(`  ${summary.itemCount} items`);
  lines.push(divider);
  lines.push("");
  lines.push("Marketplaces:");
  for (const mp of MARKETPLACES) {
    if (mp.isActive) {
      const searchUrl = `${mp.baseUrl}${encodeURIComponent(summary.diagnosisContext.partName)}`;
      lines.push(`  ${mp.name}: ${searchUrl}`);
    }
  }
  lines.push("");
  lines.push("— MotoAI Assistant");

  return lines.join("\n");
}

/**
 * Exports the cart as a CSV string (compatible with spreadsheets).
 *
 * @returns CSV string
 */
export function exportAsCsv(): string {
  const summary = getCartSummary();
  const rows: string[] = [];

  // Header
  rows.push("Type,Name,OEM Number,Quantity,Unit Price (INR),Total (INR),Priority,Required,Owned,Reason");

  // Data rows
  for (const item of summary.items) {
    rows.push([
      item.type,
      `"${item.name}"`,
      item.oemNumber ? `"${item.oemNumber}"` : "",
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      item.priority,
      item.isRequired ? "Yes" : "No",
      item.alreadyOwned ? "Yes" : "No",
      `"${item.reason}"`,
    ].join(","));
  }

  // Totals row
  rows.push("");
  rows.push(`Total,,,,,${summary.grandTotal},${summary.itemCount} items,,,,`);

  return rows.join("\n");
}

/**
 * Returns active marketplace links with search URLs for each item.
 *
 * @param searchTerm - The item to search for
 * @returns Array of marketplace links
 */
export function getMarketplaceLinks(searchTerm: string): MarketplaceLink[] {
  return MARKETPLACES
    .filter((mp) => mp.isActive)
    .map((mp) => ({
      ...mp,
      baseUrl: `${mp.baseUrl}${encodeURIComponent(searchTerm)}`,
    }));
}

/**
 * Generates mock price comparisons for an item across different sources.
 * In production, this would call real marketplace APIs.
 *
 * @param itemName - The item name
 * @param basePrice - The base price
 * @returns Array of PriceSource
 */
export function generatePriceComparisons(itemName: string, basePrice: number): PriceSource[] {
  return [
    {
      source: "Local Shop (estimated)",
      price: basePrice,
      deliveryEstimate: "Available now",
    },
    {
      source: "Amazon India",
      price: Math.round(basePrice * (0.9 + Math.random() * 0.3)),
      url: `https://www.amazon.in/s?k=${encodeURIComponent(itemName)}`,
      deliveryEstimate: "2-5 days",
    },
    {
      source: "Boodmo",
      price: Math.round(basePrice * (0.85 + Math.random() * 0.25)),
      url: `https://boodmo.com/catalog/?q=${encodeURIComponent(itemName)}`,
      deliveryEstimate: "3-7 days",
    },
  ];
}

/**
 * Gets the best price for a cart item across all sources.
 *
 * @param itemId - The cart item ID
 * @returns The best PriceSource, or null if item not found
 */
export function getBestPrice(itemId: string): PriceSource | null {
  const item = _cartItems.get(itemId);
  if (!item || item.priceComparison.length === 0) return null;

  return item.priceComparison.reduce((best, current) =>
    current.price < best.price ? current : best,
  );
}

/**
 * Calculates potential savings by buying from the cheapest source.
 *
 * @param itemId - The cart item ID
 * @returns Savings amount, or 0
 */
export function getPotentialSavings(itemId: string): number {
  const item = _cartItems.get(itemId);
  if (!item || item.priceComparison.length < 2) return 0;

  const bestPrice = getBestPrice(itemId);
  if (!bestPrice) return 0;

  const localPrice = item.priceComparison.find((p) => p.source.includes("Local"));
  if (!localPrice) return 0;

  return (localPrice.price - bestPrice.price) * item.quantity;
}

/**
 * Returns the total potential savings across all cart items.
 */
export function getTotalSavings(): number {
  let total = 0;
  for (const [id] of _cartItems) {
    total += getPotentialSavings(id);
  }
  return Math.max(0, total);
}