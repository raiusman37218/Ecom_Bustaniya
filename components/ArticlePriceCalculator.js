"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  Percent,
  Sparkles,
  Scissors,
  Package,
  Truck,
  TrendingUp,
  Copy,
  Check,
  Printer,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Sliders,
  Plus,
  Trash2,
  Layers,
  Tag,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Coins
} from "lucide-react";

// Standard preset archetypes tailored to Pakistani Eastern apparel retail
const PRESET_TEMPLATES = {
  kurti_1pc: {
    id: "kurti_1pc",
    name: "1-Piece Everyday Kurti",
    tagline: "Lawn / Cotton single shirt with trims",
    category: "Kurtis",
    fabricItems: [
      { id: "fab-1", label: "Shirt / Kurti Fabric (Lawn / Cotton)", meters: 2.5, ratePerMeter: 450 },
    ],
    trims: [
      { id: "trim-1", label: "Neckline & Sleeves Lace (GPO / Crochet)", amount: 250 },
      { id: "trim-2", label: "Fancy Buttons / Tassels", amount: 80 },
      { id: "trim-3", label: "Piping & Finishing Patti", amount: 60 },
      { id: "trim-4", label: "Thread, Fusing & Buckram", amount: 50 },
    ],
    labour: [
      { id: "lab-1", label: "Master Tailoring / Stitching", amount: 480 },
      { id: "lab-2", label: "Neck / Placket Embroidery", amount: 220 },
      { id: "lab-3", label: "Overlock, Steam Press & QC", amount: 90 },
    ],
    packaging: [
      { id: "pkg-1", label: "Branded Zipper Pouch", amount: 75 },
      { id: "pkg-2", label: "Woven Neck Label & Hang Tag", amount: 35 },
      { id: "pkg-3", label: "Thank You Card & Silica", amount: 20 },
    ],
    commercial: [
      { id: "com-1", label: "Meta / TikTok Ad CAC per piece", amount: 350 },
      { id: "com-2", label: "Courier Standard Delivery", amount: 200 },
      { id: "com-3", label: "COD Return (RTO) Risk Buffer", amount: 130 },
      { id: "com-4", label: "Studio & Overhead Allocation", amount: 90 },
    ],
    targetMargin: 35,
    discountPercent: 20,
  },
  coord_2pc: {
    id: "coord_2pc",
    name: "2-Piece Co-Ord Set",
    tagline: "Matching Top & Trouser with contemporary silhouette",
    category: "Co-ord Sets",
    fabricItems: [
      { id: "fab-1", label: "Shirt & Trouser Fabric (Lawn / Cambric)", meters: 4.5, ratePerMeter: 450 },
    ],
    trims: [
      { id: "trim-1", label: "Minimalist Lace & Organza Insert", amount: 320 },
      { id: "trim-2", label: "Buttons & Collar Finishing", amount: 120 },
      { id: "trim-3", label: "Trouser Elastic, Buckram & Piping", amount: 110 },
      { id: "trim-4", label: "Quality Thread & Labels", amount: 60 },
    ],
    labour: [
      { id: "lab-1", label: "2-Piece Tailoring & Master Cutting", amount: 750 },
      { id: "lab-2", label: "Dyeing / Digital Print charges", amount: 180 },
      { id: "lab-3", label: "Finishing, Overlock & QC", amount: 120 },
    ],
    packaging: [
      { id: "pkg-1", label: "Branded Zipper Poly Pouch", amount: 85 },
      { id: "pkg-2", label: "Woven Neck Label & Care Label", amount: 40 },
      { id: "pkg-3", label: "Thank You Card & Packaging Box", amount: 45 },
    ],
    commercial: [
      { id: "com-1", label: "Meta / TikTok Ad CAC per piece", amount: 450 },
      { id: "com-2", label: "Courier Standard Delivery", amount: 200 },
      { id: "com-3", label: "COD Return (RTO) Risk Buffer", amount: 160 },
      { id: "com-4", label: "Studio & Overhead Allocation", amount: 120 },
    ],
    targetMargin: 38,
    discountPercent: 20,
  },
  suit_3pc: {
    id: "suit_3pc",
    name: "3-Piece Luxury Festive Suit",
    tagline: "Embroidered Shirt, Dyed Trouser & Printed/Chiffon Dupatta",
    category: "3 Piece Suits",
    fabricItems: [
      { id: "fab-1", label: "Shirt Fabric (Lawn / Chiffon / Jacquard)", meters: 2.75, ratePerMeter: 550 },
      { id: "fab-2", label: "Trouser Fabric (Cotton Cambric / Silk)", meters: 2.25, ratePerMeter: 420 },
      { id: "fab-3", label: "Dupatta (Chiffon / Silk / Organza)", meters: 2.5, ratePerMeter: 420 },
      { id: "fab-4", label: "Inner / Slip Lining (Optional)", meters: 0, ratePerMeter: 220 },
    ],
    trims: [
      { id: "trim-1", label: "Embroidered Borders & GPO Laces", amount: 550 },
      { id: "trim-2", label: "Luxury Tassels, Latkans & Pearls", amount: 220 },
      { id: "trim-3", label: "Piping, Organza Patti & Buckram", amount: 160 },
      { id: "trim-4", label: "Dupatta Finishing & Four-Side Lace", amount: 320 },
    ],
    labour: [
      { id: "lab-1", label: "3-Piece Master Stitching & Finishing", amount: 1100 },
      { id: "lab-2", label: "Adda Work / Tilla / Thread Embroidery", amount: 850 },
      { id: "lab-3", label: "Dyeing & Colour Matching", amount: 250 },
      { id: "lab-4", label: "Overlock, Steam Press & Final QC", amount: 180 },
    ],
    packaging: [
      { id: "pkg-1", label: "Luxury Rigid Brand Box / Presentation Case", amount: 180 },
      { id: "pkg-2", label: "Woven Neck Label, Tag & Seal", amount: 50 },
      { id: "pkg-3", label: "Tissue Paper, Envelope & Invoice Card", amount: 40 },
    ],
    commercial: [
      { id: "com-1", label: "Meta Ad Spend CAC per piece", amount: 650 },
      { id: "com-2", label: "Courier Standard Delivery", amount: 200 },
      { id: "com-3", label: "COD Return (RTO) Risk Buffer", amount: 220 },
      { id: "com-4", label: "Studio, Utilities & Logistics Overhead", amount: 160 },
    ],
    targetMargin: 40,
    discountPercent: 22,
  },
  bottom_1pc: {
    id: "bottom_1pc",
    name: "Stitched Trouser / Pants",
    tagline: "Straight pants, tulip, culottes or shalwar",
    category: "Bottoms",
    fabricItems: [
      { id: "fab-1", label: "Cambric / Raw Silk / Cotton", meters: 2.25, ratePerMeter: 400 },
    ],
    trims: [
      { id: "trim-1", label: "Pintucks lace & Bottom border", amount: 140 },
      { id: "trim-2", label: "Elastic, Fusing & Pocket lining", amount: 110 },
      { id: "trim-3", label: "Thread & Finishing", amount: 40 },
    ],
    labour: [
      { id: "lab-1", label: "Trouser Tailoring & Cutting", amount: 350 },
      { id: "lab-2", label: "Overlock, Press & QC", amount: 70 },
    ],
    packaging: [
      { id: "pkg-1", label: "Zipper Pouch & Tag", amount: 65 },
      { id: "pkg-2", label: "Care Label & Card", amount: 25 },
    ],
    commercial: [
      { id: "com-1", label: "Meta Ad CAC per piece", amount: 280 },
      { id: "com-2", label: "Courier Standard Delivery", amount: 200 },
      { id: "com-3", label: "COD Return (RTO) Risk Buffer", amount: 110 },
      { id: "com-4", label: "Studio Overhead Allocation", amount: 70 },
    ],
    targetMargin: 30,
    discountPercent: 15,
  },
};

export default function ArticlePriceCalculator({
  products = [],
  onApplyToProduct,
  isOpenAsModal = false,
  onClose,
  initialProduct = null,
}) {
  const [selectedPreset, setSelectedPreset] = useState("suit_3pc");
  const [articleName, setArticleName] = useState(() => initialProduct?.name || "Gul-e-Lala Festive 3pc");
  const [articleCategory, setArticleCategory] = useState(() => initialProduct?.category || "3 Piece Suits");

  // Cost state
  const [fabricItems, setFabricItems] = useState(() => PRESET_TEMPLATES.suit_3pc.fabricItems);
  const [trims, setTrims] = useState(() => PRESET_TEMPLATES.suit_3pc.trims);
  const [labour, setLabour] = useState(() => PRESET_TEMPLATES.suit_3pc.labour);
  const [packaging, setPackaging] = useState(() => PRESET_TEMPLATES.suit_3pc.packaging);
  const [commercial, setCommercial] = useState(() => PRESET_TEMPLATES.suit_3pc.commercial);

  // Pricing controls
  const [pricingMode, setPricingMode] = useState("target_margin"); // 'target_margin' | 'target_profit' | 'manual_price'
  const [targetMargin, setTargetMargin] = useState(38); // %
  const [targetProfit, setTargetProfit] = useState(2000); // PKR
  const [manualPrice, setManualPrice] = useState(7990); // PKR
  const [charmPricing, setCharmPricing] = useState(true); // round to .990 or .490
  const [discountPercent, setDiscountPercent] = useState(20); // for compare-at MSRP

  const [copiedNotification, setCopiedNotification] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState("all"); // 'all' | 'fabric' | 'trims' | 'labour' | 'commercial'

  // Apply a template preset
  function handleSelectPreset(presetKey) {
    const preset = PRESET_TEMPLATES[presetKey];
    if (!preset) return;
    setSelectedPreset(presetKey);
    setArticleCategory(preset.category);
    setFabricItems(preset.fabricItems.map((item) => ({ ...item })));
    setTrims(preset.trims.map((item) => ({ ...item })));
    setLabour(preset.labour.map((item) => ({ ...item })));
    setPackaging(preset.packaging.map((item) => ({ ...item })));
    setCommercial(preset.commercial.map((item) => ({ ...item })));
    setTargetMargin(preset.targetMargin || 35);
    setDiscountPercent(preset.discountPercent || 20);
  }

  // Load an existing product from the catalog
  function handleLoadProduct(productId) {
    if (!productId) return;
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return;

    setArticleName(prod.name || "");
    setArticleCategory(prod.category || "Kurtis");

    // Match preset by category
    const cat = String(prod.category || "").toLowerCase();
    if (cat.includes("kurti")) handleSelectPreset("kurti_1pc");
    else if (cat.includes("coord") || cat.includes("co-ord")) handleSelectPreset("coord_2pc");
    else if (cat.includes("bottom")) handleSelectPreset("bottom_1pc");
    else handleSelectPreset("suit_3pc");

    if (prod.price) {
      setManualPrice(Number(prod.price));
      setPricingMode("manual_price");
    }
  }

  // Cost Computations
  const totalFabricCost = useMemo(() => {
    return fabricItems.reduce((acc, item) => acc + (Number(item.meters || 0) * Number(item.ratePerMeter || 0)), 0);
  }, [fabricItems]);

  const totalTrimsCost = useMemo(() => {
    return trims.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [trims]);

  const totalLabourCost = useMemo(() => {
    return labour.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [labour]);

  const totalPackagingCost = useMemo(() => {
    return packaging.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [packaging]);

  const totalCommercialCost = useMemo(() => {
    return commercial.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  }, [commercial]);

  // Pure Manufacturing COGS
  const totalManufacturingCost = totalFabricCost + totalTrimsCost + totalLabourCost + totalPackagingCost;

  // Total Landed Unit Cost (Production + Commercial/Marketing/Delivery)
  const totalLandedCost = totalManufacturingCost + totalCommercialCost;

  // Charm rounder: rounds a number to the nearest 990 or 490 (e.g. 5240 -> 5490, 5670 -> 5990)
  function applyCharmRounding(rawPrice) {
    if (!charmPricing) return Math.round(rawPrice);
    if (rawPrice <= 1000) {
      return Math.round(rawPrice / 50) * 50;
    }
    const baseHundreds = Math.floor(rawPrice / 1000) * 1000;
    const remainder = rawPrice - baseHundreds;

    if (remainder < 250) {
      // Round down to previous 990 or up to 490
      return baseHundreds - 1000 + 990 > rawPrice - 150 ? baseHundreds - 1000 + 990 : baseHundreds + 490;
    } else if (remainder <= 700) {
      return baseHundreds + 490;
    } else {
      return baseHundreds + 990;
    }
  }

  // Calculate final selling retail price based on mode
  const calculatedSellingPrice = useMemo(() => {
    if (totalLandedCost <= 0) return 0;

    let unrounded = 0;
    if (pricingMode === "target_margin") {
      const marginFrac = Math.min(0.85, Math.max(0.05, targetMargin / 100));
      unrounded = totalLandedCost / (1 - marginFrac);
    } else if (pricingMode === "target_profit") {
      unrounded = totalLandedCost + Number(targetProfit || 0);
    } else {
      return Number(manualPrice || 0);
    }

    return applyCharmRounding(unrounded);
  }, [pricingMode, totalLandedCost, targetMargin, targetProfit, manualPrice, charmPricing]);

  // Compare-At / Strike-through Price (MSRP)
  const compareAtPrice = useMemo(() => {
    if (calculatedSellingPrice <= 0) return 0;
    const discFrac = Math.min(0.7, Math.max(0.05, discountPercent / 100));
    const rawCompare = calculatedSellingPrice / (1 - discFrac);
    return applyCharmRounding(rawCompare);
  }, [calculatedSellingPrice, discountPercent, charmPricing]);

  // Profit Metrics
  const grossProfitPkr = calculatedSellingPrice - totalLandedCost;
  const netMarginPercent = calculatedSellingPrice > 0 ? (grossProfitPkr / calculatedSellingPrice) * 100 : 0;
  const markupOnCostPercent = totalLandedCost > 0 ? (grossProfitPkr / totalLandedCost) * 100 : 0;
  const manufacturingMarginPercent = calculatedSellingPrice > 0 ? ((calculatedSellingPrice - totalManufacturingCost) / calculatedSellingPrice) * 100 : 0;
  const breakevenPrice = Math.ceil(totalLandedCost);
  const customerSavingsPkr = compareAtPrice > calculatedSellingPrice ? compareAtPrice - calculatedSellingPrice : 0;

  // Margin Health Category
  const healthStatus = useMemo(() => {
    if (netMarginPercent < 20) {
      return {
        level: "warning",
        label: "Low Margin (< 20%)",
        color: "#b91c1c",
        bg: "#fef2f2",
        message: "Risky for COD in Pakistan! After unexpected ad spend surges or courier return penalties, net profit may turn negative.",
      };
    }
    if (netMarginPercent < 32) {
      return {
        level: "moderate",
        label: "Moderate (20% - 32%)",
        color: "#d97706",
        bg: "#fffbeb",
        message: "Fair for high-volume basics, but gives limited room for heavy Meta ad scale or seasonal clearance markdowns.",
      };
    }
    if (netMarginPercent <= 48) {
      return {
        level: "healthy",
        label: "Optimal E-Commerce Margin (32% - 48%)",
        color: "#15803d",
        bg: "#f0fdf4",
        message: "Ideal sweet spot! Ample buffer to comfortably absorb 15% COD returns, free shipping promotions, and Meta ad scale.",
      };
    }
    return {
      level: "premium",
      label: "High Luxury Margin (48%+)",
      color: "#6b21a8",
      bg: "#faf5ff",
      message: "Premium designer margin. Excellent profitability for bespoke, festive, or bridal collections.",
    };
  }, [netMarginPercent]);

  // Copy structured summary to clipboard
  function handleCopySummary() {
    const summary = `👗 *BUSTANIYA ARTICLE COSTING & PRICING SHEET*
Article: ${articleName}
Category: ${articleCategory}

📊 *COST BREAKDOWN (PKR):*
• Fabric & Raw Materials: Rs. ${totalFabricCost.toLocaleString()}
• Trims, Laces & Accessories: Rs. ${totalTrimsCost.toLocaleString()}
• Tailoring, Craft & Printing: Rs. ${totalLabourCost.toLocaleString()}
• Brand Packaging: Rs. ${totalPackagingCost.toLocaleString()}
---------------------------------
• Pure Manufacturing Cost (COGS): Rs. ${totalManufacturingCost.toLocaleString()}
• Commercial Overheads (Marketing, PostEx, RTO): Rs. ${totalCommercialCost.toLocaleString()}
=================================
*TOTAL LANDED UNIT COST:* Rs. ${totalLandedCost.toLocaleString()}

🏷️ *RETAIL PRICING RECOMMENDATION:*
• Recommended Selling Price: Rs. ${calculatedSellingPrice.toLocaleString()}
• Compare-at (Crossed-out) Price: Rs. ${compareAtPrice.toLocaleString()} (${discountPercent}% OFF)
• Estimated Net Profit: +Rs. ${Math.round(grossProfitPkr).toLocaleString()} per piece
• Net Profit Margin: ${netMarginPercent.toFixed(1)}%
• Markup on Cost: ${markupOnCostPercent.toFixed(1)}%
• Minimum Breakeven Price: Rs. ${breakevenPrice.toLocaleString()}
Generated by Bustaniya Admin Pricing Engine`;

    navigator.clipboard.writeText(summary);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  }

  // Handlers for dynamic list edits
  function updateFabricItem(id, field, value) {
    setFabricItems((curr) =>
      curr.map((item) => (item.id === id ? { ...item, [field]: Number(value) || 0 } : item))
    );
  }

  function addFabricItem() {
    const newId = `fab-${Date.now()}`;
    setFabricItems((curr) => [
      ...curr,
      { id: newId, label: "Additional Fabric / Contrast", meters: 1, ratePerMeter: 350 },
    ]);
  }

  function removeFabricItem(id) {
    setFabricItems((curr) => curr.filter((item) => item.id !== id));
  }

  function updateItemAmount(setter, id, amount) {
    setter((curr) =>
      curr.map((item) => (item.id === id ? { ...item, amount: Math.max(0, Number(amount) || 0) } : item))
    );
  }

  function handleApply() {
    if (onApplyToProduct) {
      onApplyToProduct({
        name: articleName,
        category: articleCategory,
        price: calculatedSellingPrice,
        compareAtPrice: compareAtPrice,
        costPerItem: totalManufacturingCost,
        totalLandedCost: totalLandedCost,
        marginPercent: netMarginPercent,
        costBreakdown: {
          fabric: totalFabricCost,
          stitching: totalLabourCost,
          embellishment: totalTrimsCost,
          packaging: totalPackagingCost,
          commercial: totalCommercialCost,
          landedTotal: totalLandedCost,
        },
      });
    }
  }

  return (
    <div className={`articleCalculatorWrapper ${isOpenAsModal ? "isModalWrapper" : ""}`}>
      {/* Top Header & Presets */}
      <div className="calcHeaderCard">
        <div className="calcHeaderTopRow">
          <div className="calcTitleGroup">
            <div className="calcIconBadge">
              <Calculator size={22} />
            </div>
            <div>
              <div className="calcTitleBadgeRow">
                <h1 className="calcMainTitle">Article Costing & Pricing Calculator</h1>
                <span className="calcStudioPill">Pakistani Apparel Retail Studio</span>
              </div>
              <p className="calcSubtitle">
                Accurately compute raw fabric meters, tailoring labour, GPO laces, marketing CAC, and COD return buffers to achieve healthy e-commerce margins.
              </p>
            </div>
          </div>

          <div className="calcHeaderActions">
            {products.length > 0 && (
              <div className="calcLoadProductSelectWrap">
                <Tag size={13} className="calcSelectIcon" />
                <select
                  className="calcProductDropdown"
                  onChange={(e) => handleLoadProduct(e.target.value)}
                  defaultValue=""
                  aria-label="Load product from catalog"
                >
                  <option value="" disabled>Load from catalog...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category}) — Rs. {Number(p.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="calcOutlineBtn"
              onClick={handleCopySummary}
              title="Copy WhatsApp & Studio formatted report"
            >
              {copiedNotification ? <Check size={14} color="#166534" /> : <Copy size={14} />}
              <span>{copiedNotification ? "Copied!" : "Copy Report"}</span>
            </button>

            <button
              type="button"
              className="calcOutlineBtn"
              onClick={() => window.print()}
              title="Print Costing Spec Sheet"
            >
              <Printer size={14} />
              <span>Print Sheet</span>
            </button>

            {isOpenAsModal && onClose && (
              <button type="button" className="calcCloseModalBtn" onClick={onClose} aria-label="Close calculator">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Archetype Presets */}
        <div className="calcPresetsRow">
          <span className="calcPresetsLabel">
            <Sparkles size={13} /> Quick Presets:
          </span>
          <div className="calcPresetButtonsGrid">
            {Object.entries(PRESET_TEMPLATES).map(([key, template]) => {
              const isSelected = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`calcPresetPill ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelectPreset(key)}
                >
                  <span className="presetPillName">{template.name}</span>
                  <span className="presetPillTagline">{template.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Left = Detailed Cost Inputs, Right = Sticky Profitability Engine */}
      <div className="calcMainGrid">
        {/* Left Column: All Cost Categories */}
        <div className="calcInputsColumn">
          {/* Article Info Bar */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <h2 className="calcSectionTitle">
                <Tag size={15} /> Article Identification
              </h2>
            </div>
            <div className="calcFormRow2">
              <div className="calcFormField">
                <label>Article / Design Name</label>
                <input
                  type="text"
                  value={articleName}
                  onChange={(e) => setArticleName(e.target.value)}
                  placeholder="e.g. BST-3012 Gul-e-Lala"
                  className="calcInputText"
                />
              </div>
              <div className="calcFormField">
                <label>Apparel Category</label>
                <select
                  value={articleCategory}
                  onChange={(e) => setArticleCategory(e.target.value)}
                  className="calcInputSelect"
                >
                  <option value="Kurtis">Kurtis (1-Piece)</option>
                  <option value="Co-ord Sets">Co-ord Sets (2-Piece)</option>
                  <option value="3 Piece Suits">3 Piece Suits (Festive / Formal)</option>
                  <option value="Bottoms">Bottoms / Trousers</option>
                  <option value="Formals">Formals & Luxury Pret</option>
                  <option value="Custom Order">Custom Bespoke Tailored</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: Fabric & Materials */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Scissors size={15} /> 1. Fabric & Raw Materials (کپڑا اور مٹیریل)
                </h2>
                <p className="calcSectionSubtitle">Specify fabric length in meters and unit cost per meter.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalFabricCost.toLocaleString()}</span>
            </div>

            <div className="calcTableWrap">
              <table className="calcTable">
                <thead>
                  <tr>
                    <th>Component / Fabric Type</th>
                    <th style={{ width: "110px" }}>Meters</th>
                    <th style={{ width: "130px" }}>Rate / Meter</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Subtotal</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fabricItems.map((item) => {
                    const rowTotal = (Number(item.meters || 0) * Number(item.ratePerMeter || 0));
                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFabricItems((curr) => curr.map((f) => f.id === item.id ? { ...f, label: val } : f));
                            }}
                            className="calcTableRowInput"
                          />
                        </td>
                        <td>
                          <div className="calcInputUnitWrap">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              value={item.meters}
                              onChange={(e) => updateFabricItem(item.id, "meters", e.target.value)}
                              className="calcTableNumberInput"
                            />
                            <span className="calcUnitTag">m</span>
                          </div>
                        </td>
                        <td>
                          <div className="calcInputUnitWrap">
                            <span className="calcCurrencyPrefix">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.ratePerMeter}
                              onChange={(e) => updateFabricItem(item.id, "ratePerMeter", e.target.value)}
                              className="calcTableNumberInput"
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "#16452c" }}>
                          Rs. {Math.round(rowTotal).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="calcRowDeleteBtn"
                            onClick={() => removeFabricItem(item.id)}
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" className="calcAddRowBtn" onClick={addFabricItem}>
              <Plus size={13} /> Add Fabric Component
            </button>
          </div>

          {/* Section 2: Embellishments & Trims */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Layers size={15} /> 2. Embellishments, Laces & Accessories (لیس، بٹن اور میٹریل)
                </h2>
                <p className="calcSectionSubtitle">Laces, motifs, organza borders, latkans, fusing and stitching sundries.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalTrimsCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {trims.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <label className="calcItemLabel">{item.label}</label>
                  <div className="calcCurrencyInputBox">
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateItemAmount(setTrims, item.id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Tailoring, Printing & Craft Labour */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Scissors size={15} /> 3. Tailoring, Printing & Craft Labour (سلائی اور کڑھائی)
                </h2>
                <p className="calcSectionSubtitle">Master tailor stitching, computer embroidery, hand adda work, and dyeing.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalLabourCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {labour.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <label className="calcItemLabel">{item.label}</label>
                  <div className="calcCurrencyInputBox">
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateItemAmount(setLabour, item.id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Packaging & Brand Presentation */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Package size={15} /> 4. Packaging & Brand Presentation (پیکجنگ)
                </h2>
                <p className="calcSectionSubtitle">Branded zipper pouches, boxes, woven neck labels, and tissue wrap.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalPackagingCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {packaging.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <label className="calcItemLabel">{item.label}</label>
                  <div className="calcCurrencyInputBox">
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateItemAmount(setPackaging, item.id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Commercial Overheads & Delivery Provisions */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Truck size={15} /> 5. E-Commerce Operations & Courier Buffer (مارکیٹنگ اور ڈلیوری بفر)
                </h2>
                <p className="calcSectionSubtitle">
                  Essential for Pakistani COD e-commerce: buffers for Meta Ad CAC, PostEx logistics, and RTO return risks.
                </p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalCommercialCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {commercial.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <div>
                    <label className="calcItemLabel">{item.label}</label>
                    {item.label.includes("RTO") && (
                      <span className="calcHelperNote">Covers ~12% rejected/returned COD parcels</span>
                    )}
                    {item.label.includes("CAC") && (
                      <span className="calcHelperNote">Average ad spend per single order</span>
                    )}
                  </div>
                  <div className="calcCurrencyInputBox">
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount || ""}
                      onChange={(e) => updateItemAmount(setCommercial, item.id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Pricing Engine & Visual Margin Simulator */}
        <div className="calcSidebarColumn">
          <div className="calcSummaryStickyCard">
            <div className="calcSummaryHeader">
              <span className="calcSummaryBadge">Pricing Engine</span>
              <h3 className="calcSummaryTitle">Financial Feasibility & Profitability</h3>
            </div>

            {/* Total Landed Cost Breakdown */}
            <div className="calcCostSummaryBox">
              <div className="calcCostLine">
                <span className="calcCostLabel">
                  <Package size={13} /> Pure Manufacturing (COGS):
                </span>
                <b className="calcCostVal">Rs. {totalManufacturingCost.toLocaleString()}</b>
              </div>
              <div className="calcCostLine">
                <span className="calcCostLabel">
                  <Truck size={13} /> Commercial & Ops Buffer:
                </span>
                <b className="calcCostVal">Rs. {totalCommercialCost.toLocaleString()}</b>
              </div>
              <div className="calcCostDivider" />
              <div className="calcTotalCostLine">
                <span>Total Landed Unit Cost:</span>
                <b className="calcTotalCostPill">Rs. {totalLandedCost.toLocaleString()}</b>
              </div>
            </div>

            {/* Pricing Mode Selector */}
            <div className="calcPricingModeSection">
              <label className="calcModeLabel">Select Pricing Calculation Strategy:</label>
              <div className="calcModeToggleGroup">
                <button
                  type="button"
                  className={`calcModeBtn ${pricingMode === "target_margin" ? "active" : ""}`}
                  onClick={() => setPricingMode("target_margin")}
                >
                  <Percent size={13} /> Margin %
                </button>
                <button
                  type="button"
                  className={`calcModeBtn ${pricingMode === "target_profit" ? "active" : ""}`}
                  onClick={() => setPricingMode("target_profit")}
                >
                  <Coins size={13} /> Fixed Profit (Rs.)
                </button>
                <button
                  type="button"
                  className={`calcModeBtn ${pricingMode === "manual_price" ? "active" : ""}`}
                  onClick={() => setPricingMode("manual_price")}
                >
                  <Tag size={13} /> Target Price
                </button>
              </div>

              {/* Slider for Margin % Mode */}
              {pricingMode === "target_margin" && (
                <div className="calcModeControlBox">
                  <div className="calcSliderHeader">
                    <span>Desired Net Profit Margin:</span>
                    <b className="calcSliderValBadge">{targetMargin}%</b>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="65"
                    step="1"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="calcSlider"
                  />
                  <div className="calcQuickMarginPills">
                    {[25, 30, 35, 40, 45, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`calcQuickPill ${targetMargin === val ? "active" : ""}`}
                        onClick={() => setTargetMargin(val)}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed Profit in PKR */}
              {pricingMode === "target_profit" && (
                <div className="calcModeControlBox">
                  <label className="calcModeSubLabel">Target Net Profit per Piece (PKR):</label>
                  <div className="calcCurrencyInputBox" style={{ width: "100%" }}>
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      step="100"
                      min="100"
                      value={targetProfit}
                      onChange={(e) => setTargetProfit(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>
              )}

              {/* Manual Selling Price Input */}
              {pricingMode === "manual_price" && (
                <div className="calcModeControlBox">
                  <label className="calcModeSubLabel">Intended Retail Selling Price (PKR):</label>
                  <div className="calcCurrencyInputBox" style={{ width: "100%" }}>
                    <span className="calcCurrencyPrefix">Rs.</span>
                    <input
                      type="number"
                      step="100"
                      min="500"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>
              )}

              {/* Charm Pricing Toggle */}
              <div className="calcCharmPricingRow">
                <label className="calcCharmCheckboxLabel">
                  <input
                    type="checkbox"
                    checked={charmPricing}
                    onChange={(e) => setCharmPricing(e.target.checked)}
                  />
                  <span>
                    <b>Pakistani Retail Charm Rounding</b>
                    <small>Auto-format endings to .990 or .490 (e.g. Rs. 4,990 / Rs. 5,490)</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Calculated Retail Selling Price Highlight Box */}
            <div className="calcRetailResultCard">
              <span className="calcRetailLabel">Recommended Retail Price</span>
              <div className="calcRetailPriceDisplay">
                <span className="calcPkrSymbol">Rs.</span>
                <span className="calcPkrAmount">{calculatedSellingPrice.toLocaleString()}</span>
              </div>

              {/* Compare-at Strike-Through Section */}
              <div className="calcCompareRow">
                <div>
                  <span className="calcCompareSubLabel">Strike-Through (MSRP):</span>
                  <div className="calcComparePillBox">
                    <del className="calcCompareCrossed">Rs. {compareAtPrice.toLocaleString()}</del>
                    <span className="calcDiscountBadge">{discountPercent}% OFF</span>
                  </div>
                </div>

                <div className="calcDiscountSelectWrap">
                  <label>Discount %</label>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="calcSmallSelect"
                  >
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                    <option value="35">35%</option>
                  </select>
                </div>
              </div>

              {customerSavingsPkr > 0 && (
                <p className="calcCustomerPerception">
                  ✨ Shopper perceives saving of <b>Rs. {customerSavingsPkr.toLocaleString()}</b> on your website!
                </p>
              )}
            </div>

            {/* Margin & Profit Performance KPIs */}
            <div className="calcProfitKpiGrid">
              <div className="calcKpiCard">
                <span className="calcKpiLabel">Net Profit / Piece</span>
                <b className={`calcKpiVal ${grossProfitPkr >= 0 ? "positive" : "negative"}`}>
                  Rs. {Math.round(grossProfitPkr).toLocaleString()}
                </b>
              </div>

              <div className="calcKpiCard">
                <span className="calcKpiLabel">Net Profit Margin</span>
                <b className={`calcKpiVal ${netMarginPercent >= 25 ? "positive" : "warning"}`}>
                  {netMarginPercent.toFixed(1)}%
                </b>
              </div>

              <div className="calcKpiCard">
                <span className="calcKpiLabel">Markup on Cost</span>
                <b className="calcKpiVal neutral">+{markupOnCostPercent.toFixed(0)}%</b>
              </div>

              <div className="calcKpiCard">
                <span className="calcKpiLabel">Breakeven Threshold</span>
                <b className="calcKpiVal neutral">Rs. {breakevenPrice.toLocaleString()}</b>
              </div>
            </div>

            {/* Financial Health Status Banner */}
            <div
              className="calcHealthBanner"
              style={{
                backgroundColor: healthStatus.bg,
                borderColor: healthStatus.color,
                color: healthStatus.color,
              }}
            >
              <div className="calcHealthTitleRow">
                {healthStatus.level === "warning" ? (
                  <AlertTriangle size={15} />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                <b>{healthStatus.label}</b>
              </div>
              <p className="calcHealthDesc">{healthStatus.message}</p>
            </div>

            {/* Action Buttons */}
            <div className="calcActionButtonsGroup">
              {onApplyToProduct && (
                <button
                  type="button"
                  className="calcApplyBtn"
                  onClick={handleApply}
                >
                  <Check size={16} /> Apply Pricing to Product
                </button>
              )}

              <button
                type="button"
                className="calcCopyBtn"
                onClick={handleCopySummary}
              >
                {copiedNotification ? <Check size={16} /> : <Copy size={16} />}
                {copiedNotification ? "Copied to Clipboard!" : "Copy WhatsApp Report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for standalone styling */}
      <style jsx>{`
        .articleCalculatorWrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #173d29;
          font-family: inherit;
        }

        .articleCalculatorWrapper.isModalWrapper {
          max-height: 85vh;
          overflow-y: auto;
          padding: 8px 4px;
        }

        /* Header Card */
        .calcHeaderCard {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #dce4dd;
          padding: 22px 24px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }

        .calcHeaderTopRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .calcTitleGroup {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          max-width: 750px;
        }

        .calcIconBadge {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #173d29;
          color: #fcf9f2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(23, 61, 41, 0.2);
        }

        .calcTitleBadgeRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .calcMainTitle {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #112d1e;
          letter-spacing: -0.01em;
        }

        .calcStudioPill {
          font-size: 11px;
          font-weight: 700;
          background: #f1f6f2;
          color: #16452c;
          border: 1px solid #d4e2d7;
          border-radius: 999px;
          padding: 3px 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calcSubtitle {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #556b5e;
        }

        .calcHeaderActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .calcLoadProductSelectWrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .calcSelectIcon {
          position: absolute;
          left: 10px;
          color: #6a7f72;
          pointer-events: none;
        }

        .calcProductDropdown {
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 12px 7px 28px;
          border-radius: 8px;
          border: 1px solid #d0ded3;
          background: #fcfdfc;
          color: #16452c;
          outline: none;
          cursor: pointer;
        }

        .calcOutlineBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid #d2ded4;
          background: #ffffff;
          color: #1a432e;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcOutlineBtn:hover {
          background: #f4f8f5;
          border-color: #173d29;
        }

        .calcCloseModalBtn {
          border: none;
          background: #f3f4f6;
          color: #374151;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .calcCloseModalBtn:hover {
          background: #e5e7eb;
        }

        /* Quick Presets Bar */
        .calcPresetsRow {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #edf2ee;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .calcPresetsLabel {
          font-size: 12px;
          font-weight: 750;
          color: #1b4530;
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calcPresetButtonsGrid {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .calcPresetPill {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #d8e4db;
          background: #fafcfa;
          color: #244633;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all 0.15s ease;
        }

        .calcPresetPill:hover {
          border-color: #173d29;
          background: #f1f7f2;
        }

        .calcPresetPill.active {
          background: #173d29;
          color: #ffffff;
          border-color: #173d29;
          box-shadow: 0 2px 6px rgba(23, 61, 41, 0.2);
        }

        .presetPillName {
          font-size: 12px;
          font-weight: 750;
        }

        .presetPillTagline {
          font-size: 10px;
          opacity: 0.8;
        }

        /* 2-Column Grid Layout */
        .calcMainGrid {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .calcMainGrid {
            grid-template-columns: 1fr;
          }
        }

        .calcInputsColumn {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calcSectionCard {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #dce4dd;
          padding: 20px 22px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .calcSectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .calcSectionTitle {
          margin: 0;
          font-size: 15px;
          font-weight: 750;
          color: #173d29;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .calcSectionSubtitle {
          margin: 3px 0 0;
          font-size: 11.5px;
          color: #6a7c71;
        }

        .calcSubtotalPill {
          font-size: 12.5px;
          font-weight: 800;
          color: #16452c;
          background: #edf5ee;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #d0e4d4;
          white-space: nowrap;
        }

        .calcFormRow2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 600px) {
          .calcFormRow2 {
            grid-template-columns: 1fr;
          }
        }

        .calcFormField {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .calcFormField label {
          font-size: 12px;
          font-weight: 700;
          color: #2b4535;
        }

        .calcInputText,
        .calcInputSelect {
          width: 100%;
          border: 1px solid #d2ded4;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #143323;
          outline: none;
        }

        .calcInputText:focus,
        .calcInputSelect:focus {
          border-color: #173d29;
          box-shadow: 0 0 0 3px rgba(23, 61, 41, 0.1);
        }

        /* Fabric Table */
        .calcTableWrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e2ebe4;
          border-radius: 8px;
        }

        .calcTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .calcTable th {
          background: #f7faf7;
          color: #4b6254;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 9px 12px;
          border-bottom: 1px solid #e2ebe4;
          text-align: left;
        }

        .calcTable td {
          padding: 8px 12px;
          border-bottom: 1px solid #edf3ee;
          vertical-align: middle;
        }

        .calcTableRowInput {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #173d29;
          padding: 5px;
          border-radius: 6px;
          outline: none;
        }

        .calcTableRowInput:focus {
          background: #ffffff;
          border-color: #173d29;
        }

        .calcInputUnitWrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid #d0ded3;
          border-radius: 6px;
          background: #ffffff;
        }

        .calcUnitTag {
          position: absolute;
          right: 8px;
          font-size: 11px;
          color: #7b8d82;
          font-weight: 600;
          pointer-events: none;
        }

        .calcCurrencyPrefix {
          padding-left: 8px;
          font-size: 11px;
          color: #7b8d82;
          font-weight: 700;
        }

        .calcTableNumberInput {
          width: 100%;
          border: none;
          background: transparent;
          padding: 6px 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #132f22;
          outline: none;
        }

        .calcRowDeleteBtn {
          border: none;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .calcRowDeleteBtn:hover {
          color: #b91c1c;
          background: #fee2e2;
        }

        .calcAddRowBtn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f7faf8;
          border: 1px dashed #cad9ce;
          border-radius: 7px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #18422d;
          cursor: pointer;
        }

        .calcAddRowBtn:hover {
          border-color: #173d29;
          background: #edf5ee;
        }

        /* Generic Cost Grid Rows */
        .calcGridRows {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .calcGridRowItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 8px 10px;
          background: #fafcfa;
          border-radius: 8px;
          border: 1px solid #edf4ee;
        }

        .calcItemLabel {
          font-size: 12.5px;
          font-weight: 650;
          color: #274735;
          display: block;
        }

        .calcHelperNote {
          display: block;
          font-size: 11px;
          color: #798f82;
          margin-top: 1px;
        }

        .calcCurrencyInputBox {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #cddcd0;
          border-radius: 7px;
          padding: 0 4px;
          width: 140px;
          flex-shrink: 0;
        }

        .calcCurrencyInputBox:focus-within {
          border-color: #173d29;
          box-shadow: 0 0 0 2px rgba(23, 61, 41, 0.1);
        }

        .calcCurrencyInputBox input {
          width: 100%;
          border: none;
          padding: 6px 6px;
          font-size: 13px;
          font-weight: 700;
          color: #123824;
          outline: none;
          text-align: right;
        }

        /* Right Column Sticky Card */
        .calcSidebarColumn {
          position: sticky;
          top: 80px;
        }

        .calcSummaryStickyCard {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #d5e0d7;
          padding: 22px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calcSummaryHeader {
          border-bottom: 1px solid #edf2ee;
          padding-bottom: 12px;
        }

        .calcSummaryBadge {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #173d29;
          background: #eef5ef;
          padding: 3px 8px;
          border-radius: 5px;
        }

        .calcSummaryTitle {
          margin: 6px 0 0;
          font-size: 16px;
          font-weight: 800;
          color: #123422;
        }

        /* Cost Summary Line Box */
        .calcCostSummaryBox {
          background: #f7faf7;
          border: 1px solid #e1ebe3;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .calcCostLine {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12.5px;
          color: #4b6254;
        }

        .calcCostLabel {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .calcCostVal {
          color: #19432d;
          font-weight: 700;
        }

        .calcCostDivider {
          height: 1px;
          background: #dce7df;
          margin: 2px 0;
        }

        .calcTotalCostLine {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 750;
          color: #133a25;
        }

        .calcTotalCostPill {
          background: #173d29;
          color: #ffffff;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 800;
        }

        /* Mode Selector */
        .calcPricingModeSection {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .calcModeLabel {
          font-size: 11.5px;
          font-weight: 750;
          color: #2b4b37;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .calcModeToggleGroup {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4px;
          background: #f0f4f1;
          padding: 3px;
          border-radius: 8px;
        }

        .calcModeBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 8px;
          border: none;
          background: transparent;
          color: #496353;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcModeBtn.active {
          background: #ffffff;
          color: #173d29;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .calcModeControlBox {
          background: #fafcfb;
          border: 1px solid #e2ebe4;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .calcSliderHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 650;
          color: #224230;
        }

        .calcSliderValBadge {
          background: #173d29;
          color: #ffffff;
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .calcSlider {
          width: 100%;
          accent-color: #173d29;
          cursor: pointer;
        }

        .calcQuickMarginPills {
          display: flex;
          gap: 5px;
        }

        .calcQuickPill {
          flex: 1;
          padding: 3px 0;
          border-radius: 5px;
          border: 1px solid #d4e2d7;
          background: #ffffff;
          font-size: 11px;
          font-weight: 700;
          color: #2e533d;
          cursor: pointer;
          text-align: center;
        }

        .calcQuickPill.active {
          background: #173d29;
          color: #ffffff;
          border-color: #173d29;
        }

        .calcModeSubLabel {
          font-size: 11.5px;
          font-weight: 700;
          color: #375643;
        }

        /* Charm Pricing */
        .calcCharmPricingRow {
          padding-top: 4px;
        }

        .calcCharmCheckboxLabel {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          color: #284c37;
        }

        .calcCharmCheckboxLabel input {
          margin-top: 2px;
          accent-color: #173d29;
        }

        .calcCharmCheckboxLabel span {
          display: flex;
          flex-direction: column;
        }

        .calcCharmCheckboxLabel small {
          font-size: 11px;
          color: #6a7f72;
          font-weight: 500;
        }

        /* Result Card */
        .calcRetailResultCard {
          background: linear-gradient(135deg, #123b26 0%, #174d32 100%);
          border-radius: 12px;
          padding: 16px 18px;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(18, 59, 38, 0.25);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .calcRetailLabel {
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #c9dfd0;
        }

        .calcRetailPriceDisplay {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .calcPkrSymbol {
          font-size: 18px;
          font-weight: 600;
          color: #e5f1e8;
        }

        .calcPkrAmount {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1;
        }

        .calcCompareRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 10px;
        }

        .calcCompareSubLabel {
          font-size: 10.5px;
          color: #d1e5d7;
          display: block;
        }

        .calcComparePillBox {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .calcCompareCrossed {
          font-size: 13px;
          color: #fca5a5;
          text-decoration: line-through;
        }

        .calcDiscountBadge {
          font-size: 11px;
          font-weight: 800;
          background: #bd194b;
          color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .calcDiscountSelectWrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .calcDiscountSelectWrap label {
          font-size: 10px;
          color: #d1e5d7;
        }

        .calcSmallSelect {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          outline: none;
        }

        .calcSmallSelect option {
          color: #173d29;
          background: #ffffff;
        }

        .calcCustomerPerception {
          margin: 0;
          font-size: 11.5px;
          line-height: 1.4;
          color: #e3faea;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          padding-top: 8px;
        }

        /* KPI Grid */
        .calcProfitKpiGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .calcKpiCard {
          background: #fafcfa;
          border: 1px solid #e1eae3;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .calcKpiLabel {
          font-size: 11px;
          font-weight: 650;
          color: #667c6f;
        }

        .calcKpiVal {
          font-size: 15px;
          font-weight: 850;
          line-height: 1.2;
        }

        .calcKpiVal.positive {
          color: #15803d;
        }

        .calcKpiVal.warning {
          color: #d97706;
        }

        .calcKpiVal.negative {
          color: #b91c1c;
        }

        .calcKpiVal.neutral {
          color: #1b3d2b;
        }

        /* Health Banner */
        .calcHealthBanner {
          border-radius: 8px;
          border-left: 4px solid;
          padding: 10px 12px;
          font-size: 12px;
        }

        .calcHealthTitleRow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
        }

        .calcHealthDesc {
          margin: 4px 0 0;
          font-size: 11.5px;
          line-height: 1.4;
          opacity: 0.9;
        }

        /* Action Buttons */
        .calcActionButtonsGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .calcApplyBtn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 8px;
          border: none;
          background: #173d29;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(23, 61, 41, 0.2);
        }

        .calcApplyBtn:hover {
          background: #0f2c1c;
        }

        .calcCopyBtn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid #d2ded5;
          background: #ffffff;
          color: #173d29;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcCopyBtn:hover {
          background: #f3f8f4;
          border-color: #173d29;
        }
      `}</style>
    </div>
  );
}
