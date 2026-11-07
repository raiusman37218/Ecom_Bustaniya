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
  Sliders,
  Plus,
  Trash2,
  Layers,
  Tag,
  Coins,
  BarChart3,
  PieChart,
  ShoppingBag,
  Store,
  RefreshCw,
  X,
  ArrowRight
} from "lucide-react";

// Standard preset archetypes tailored to Eastern apparel & ready-to-wear fashion
const PRESET_TEMPLATES = {
  kurti_1pc: {
    id: "kurti_1pc",
    name: "1-Piece Everyday Shirt",
    tagline: "Single lawn or cotton stitched shirt with contemporary trims",
    category: "Kurtis",
    fabricItems: [
      { id: "fab-1", label: "Shirt Fabric (Premium Lawn / Cotton)", meters: 2.5, ratePerMeter: 450 },
    ],
    trims: [
      { id: "trim-1", label: "Neckline & Sleeve Lace Trims", amount: 250 },
      { id: "trim-2", label: "Decorative Buttons & Tassels", amount: 80 },
      { id: "trim-3", label: "Piping & Hem Finishing Strips", amount: 60 },
      { id: "trim-4", label: "Thread, Fusing & Buckram", amount: 50 },
    ],
    labour: [
      { id: "lab-1", label: "Master Cutting & Tailoring", amount: 480 },
      { id: "lab-2", label: "Neckline & Placket Embroidery", amount: 220 },
      { id: "lab-3", label: "Overlock, Steam Press & Quality Inspection", amount: 90 },
    ],
    packaging: [
      { id: "pkg-1", label: "Branded Zipper Poly Pouch", amount: 75 },
      { id: "pkg-2", label: "Woven Neck Label & Hang Tag", amount: 35 },
      { id: "pkg-3", label: "Thank You Note & Desiccant Silica", amount: 20 },
    ],
    commercial: [
      { id: "com-1", label: "Digital Ad Customer Acquisition Cost (CAC)", amount: 350 },
      { id: "com-2", label: "Standard Courier Delivery Provision", amount: 200 },
      { id: "com-3", label: "Cash on Delivery Return Risk Buffer (RTO)", amount: 130 },
      { id: "com-4", label: "Studio & General Overhead Allocation", amount: 90 },
    ],
    targetMargin: 35,
    discountPercent: 20,
  },
  coord_2pc: {
    id: "coord_2pc",
    name: "2-Piece Co-Ord Set",
    tagline: "Matching top and trousers with modern minimal silhouette",
    category: "Co-ord Sets",
    fabricItems: [
      { id: "fab-1", label: "Shirt & Trouser Fabric (Cambric / Lawn)", meters: 4.5, ratePerMeter: 450 },
    ],
    trims: [
      { id: "trim-1", label: "Minimalist Lace & Organza Inserts", amount: 320 },
      { id: "trim-2", label: "Buttons & Collar Finishing", amount: 120 },
      { id: "trim-3", label: "Trouser Elastic, Interlining & Piping", amount: 110 },
      { id: "trim-4", label: "Reinforced Stitching Thread & Care Labels", amount: 60 },
    ],
    labour: [
      { id: "lab-1", label: "2-Piece Master Cutting & Stitching", amount: 750 },
      { id: "lab-2", label: "Dyeing / Digital Print charges", amount: 180 },
      { id: "lab-3", label: "Finishing, Overlock & Final QC", amount: 120 },
    ],
    packaging: [
      { id: "pkg-1", label: "Branded Zipper Bag", amount: 85 },
      { id: "pkg-2", label: "Woven Neck Label & Fabric Care Tag", amount: 40 },
      { id: "pkg-3", label: "Presentation Box & Invoice Card", amount: 45 },
    ],
    commercial: [
      { id: "com-1", label: "Digital Ad Customer Acquisition Cost (CAC)", amount: 450 },
      { id: "com-2", label: "Standard Courier Delivery Provision", amount: 200 },
      { id: "com-3", label: "Cash on Delivery Return Risk Buffer (RTO)", amount: 160 },
      { id: "com-4", label: "Studio & General Overhead Allocation", amount: 120 },
    ],
    targetMargin: 38,
    discountPercent: 20,
  },
  suit_3pc: {
    id: "suit_3pc",
    name: "3-Piece Festive Luxury Suit",
    tagline: "Embroidered shirt, dyed trousers & chiffon or silk dupatta",
    category: "3 Piece Suits",
    fabricItems: [
      { id: "fab-1", label: "Shirt Fabric (Lawn / Chiffon / Jacquard)", meters: 2.75, ratePerMeter: 550 },
      { id: "fab-2", label: "Trouser Fabric (Cotton Cambric / Raw Silk)", meters: 2.25, ratePerMeter: 420 },
      { id: "fab-3", label: "Dupatta (Chiffon / Silk / Organza)", meters: 2.5, ratePerMeter: 420 },
      { id: "fab-4", label: "Inner Slip / Lining Fabric", meters: 0, ratePerMeter: 220 },
    ],
    trims: [
      { id: "trim-1", label: "Embroidered Borders & Guipure Laces", amount: 550 },
      { id: "trim-2", label: "Luxury Tassels, Pearls & Motifs", amount: 220 },
      { id: "trim-3", label: "Piping, Organza Strips & Buckram", amount: 160 },
      { id: "trim-4", label: "Dupatta Four-Side Border Finishing", amount: 320 },
    ],
    labour: [
      { id: "lab-1", label: "3-Piece Master Stitching & Tailoring", amount: 1100 },
      { id: "lab-2", label: "Hand Embellishment & Zari Embroidery", amount: 850 },
      { id: "lab-3", label: "Custom Dyeing & Color Matching", amount: 250 },
      { id: "lab-4", label: "Overlock, Steam Press & Quality Control", amount: 180 },
    ],
    packaging: [
      { id: "pkg-1", label: "Luxury Rigid Brand Presentation Box", amount: 180 },
      { id: "pkg-2", label: "Woven Neck Label, Seal & Hang Tag", amount: 50 },
      { id: "pkg-3", label: "Branded Tissue Paper & Envelope Card", amount: 40 },
    ],
    commercial: [
      { id: "com-1", label: "Digital Ad Customer Acquisition Cost (CAC)", amount: 650 },
      { id: "com-2", label: "Standard Courier Delivery Provision", amount: 200 },
      { id: "com-3", label: "Cash on Delivery Return Risk Buffer (RTO)", amount: 220 },
      { id: "com-4", label: "Studio & General Overhead Allocation", amount: 160 },
    ],
    targetMargin: 40,
    discountPercent: 22,
  },
  bottom_1pc: {
    id: "bottom_1pc",
    name: "Stitched Trousers & Pants",
    tagline: "Straight cut, tulip silhouette, or relaxed pleated trousers",
    category: "Bottoms",
    fabricItems: [
      { id: "fab-1", label: "Trouser Fabric (Cambric / Raw Silk / Cotton)", meters: 2.25, ratePerMeter: 400 },
    ],
    trims: [
      { id: "trim-1", label: "Pintuck Lace & Bottom Hem Border", amount: 140 },
      { id: "trim-2", label: "Elastic Waistband, Fusing & Pocket Lining", amount: 110 },
      { id: "trim-3", label: "Sewing Thread & Brand Labels", amount: 40 },
    ],
    labour: [
      { id: "lab-1", label: "Trouser Tailoring & Precision Cutting", amount: 350 },
      { id: "lab-2", label: "Overlock, Steam Press & Quality Control", amount: 70 },
    ],
    packaging: [
      { id: "pkg-1", label: "Branded Zipper Pouch", amount: 65 },
      { id: "pkg-2", label: "Care Label & Hang Tag", amount: 25 },
    ],
    commercial: [
      { id: "com-1", label: "Digital Ad Customer Acquisition Cost (CAC)", amount: 280 },
      { id: "com-2", label: "Standard Courier Delivery Provision", amount: 200 },
      { id: "com-3", label: "Cash on Delivery Return Risk Buffer (RTO)", amount: 110 },
      { id: "com-4", label: "Studio & General Overhead Allocation", amount: 70 },
    ],
    targetMargin: 30,
    discountPercent: 15,
  },
  luxury_pret: {
    id: "luxury_pret",
    name: "Luxury Pret / Semi-Formal",
    tagline: "Intricate threadwork on pure silk, organza or velvet",
    category: "Formals",
    fabricItems: [
      { id: "fab-1", label: "Luxury Base Fabric (Pure Silk / Organza)", meters: 3.0, ratePerMeter: 850 },
      { id: "fab-2", label: "Attached Slip / Lining Fabric", meters: 2.5, ratePerMeter: 300 },
      { id: "fab-3", label: "Trousers (Raw Silk / Viscose)", meters: 2.5, ratePerMeter: 550 },
    ],
    trims: [
      { id: "trim-1", label: "Hand-Cut Borders & Metallic Zari Trims", amount: 850 },
      { id: "trim-2", label: "Crystal Beads, Sequins & Pearl Drops", amount: 450 },
      { id: "trim-3", label: "Specialty Interfacing & Finishing Tape", amount: 180 },
    ],
    labour: [
      { id: "lab-1", label: "Artisan Hand Embroidery & Adda Craft", amount: 1600 },
      { id: "lab-2", label: "Bespoke Master Tailoring & Pattern Cut", amount: 1200 },
      { id: "lab-3", label: "Specialty Garment Dyeing & Finishing", amount: 350 },
      { id: "lab-4", label: "Hand Finishing, Steam Ironing & Final QC", amount: 220 },
    ],
    packaging: [
      { id: "pkg-1", label: "Collector Brand Box & Ribbon Tie", amount: 250 },
      { id: "pkg-2", label: "Luxury Metallic Woven Tag & Authentication Card", amount: 80 },
      { id: "pkg-3", label: "Dust Bag & Garment Protection Cover", amount: 120 },
    ],
    commercial: [
      { id: "com-1", label: "High-Ticket Digital Ad Acquisition CAC", amount: 850 },
      { id: "com-2", label: "Express Insured Courier Delivery", amount: 250 },
      { id: "com-3", label: "High-Value COD Return Protection Buffer", amount: 350 },
      { id: "com-4", label: "Design Studio & Production Overhead", amount: 220 },
    ],
    targetMargin: 45,
    discountPercent: 20,
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
  const [selectedProductId, setSelectedProductId] = useState(() => initialProduct?.id ? String(initialProduct.id) : "");
  const [articleName, setArticleName] = useState(() => initialProduct?.name || "Luxury Festive Collection");
  const [articleCategory, setArticleCategory] = useState(() => initialProduct?.category || "3 Piece Suits");

  // Dynamic cost item states
  const [fabricItems, setFabricItems] = useState(() => {
    const savedFabric = Number(initialProduct?.costBreakdown?.fabric || 0);
    if (savedFabric > 0) {
      return [{ id: "fab-1", label: "Primary Garment Fabric (Saved Catalog Cost)", meters: 1, ratePerMeter: savedFabric }];
    }
    return PRESET_TEMPLATES.suit_3pc.fabricItems;
  });
  const [trims, setTrims] = useState(() => {
    const savedTrims = Number(initialProduct?.costBreakdown?.embellishment || 0);
    if (savedTrims > 0) {
      return [{ id: "trim-1", label: "Trims, Laces & Accessories (Saved)", amount: savedTrims }];
    }
    return PRESET_TEMPLATES.suit_3pc.trims;
  });
  const [labour, setLabour] = useState(() => {
    const savedStitching = Number(initialProduct?.costBreakdown?.stitching || 0);
    if (savedStitching > 0) {
      return [{ id: "lab-1", label: "Master Tailoring & Production Labor (Saved)", amount: savedStitching }];
    }
    return PRESET_TEMPLATES.suit_3pc.labour;
  });
  const [packaging, setPackaging] = useState(() => {
    const savedPkg = Number(initialProduct?.costBreakdown?.packaging || 0);
    if (savedPkg > 0) {
      return [{ id: "pkg-1", label: "Packaging & Presentation (Saved)", amount: savedPkg }];
    }
    return PRESET_TEMPLATES.suit_3pc.packaging;
  });
  const [commercial, setCommercial] = useState(() => {
    const savedComm = Number(initialProduct?.costBreakdown?.commercial || initialProduct?.costBreakdown?.other || 0);
    if (savedComm > 0) {
      return [{ id: "com-1", label: "Commercial CAC, Delivery & Return Provision", amount: savedComm }];
    }
    return PRESET_TEMPLATES.suit_3pc.commercial;
  });

  // Pricing controls
  const [pricingMode, setPricingMode] = useState(() => initialProduct?.price > 0 ? "manual_price" : "target_margin"); // 'target_margin' | 'target_profit' | 'manual_price'
  const [targetMargin, setTargetMargin] = useState(38); // %
  const [targetProfit, setTargetProfit] = useState(2000); // PKR
  const [manualPrice, setManualPrice] = useState(() => Number(initialProduct?.price || 7990)); // PKR
  const [charmPricing, setCharmPricing] = useState(true); // round to .990 or .490
  const [discountPercent, setDiscountPercent] = useState(20); // for compare-at MSRP

  const [copiedNotification, setCopiedNotification] = useState(false);

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
    if (!productId) {
      setSelectedProductId("");
      return;
    }
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return;

    setSelectedProductId(String(prod.id));
    setArticleName(prod.name || "");
    setArticleCategory(prod.category || "Kurtis");

    const cat = String(prod.category || "").toLowerCase();
    if (cat.includes("kurti")) handleSelectPreset("kurti_1pc");
    else if (cat.includes("coord") || cat.includes("co-ord")) handleSelectPreset("coord_2pc");
    else if (cat.includes("bottom")) handleSelectPreset("bottom_1pc");
    else if (cat.includes("formal") || cat.includes("pret")) handleSelectPreset("luxury_pret");
    else handleSelectPreset("suit_3pc");

    const bd = prod.costBreakdown || prod.cost_breakdown || {};
    const hasSavedBreakdown = Number(bd.fabric || 0) + Number(bd.stitching || 0) + Number(bd.embellishment || 0) + Number(bd.packaging || 0) > 0;
    if (hasSavedBreakdown) {
      if (Number(bd.fabric || 0) > 0) {
        setFabricItems([{ id: "fab-1", label: "Primary Garment Fabric (Saved Catalog Cost)", meters: 1, ratePerMeter: Number(bd.fabric) }]);
      }
      if (Number(bd.embellishment || 0) > 0) {
        setTrims([{ id: "trim-1", label: "Trims, Laces & Accessories (Saved)", amount: Number(bd.embellishment) }]);
      }
      if (Number(bd.stitching || 0) > 0) {
        setLabour([{ id: "lab-1", label: "Master Tailoring & Production Labor (Saved)", amount: Number(bd.stitching) }]);
      }
      if (Number(bd.packaging || 0) > 0) {
        setPackaging([{ id: "pkg-1", label: "Packaging & Presentation (Saved)", amount: Number(bd.packaging) }]);
      }
      if (Number(bd.commercial || bd.other || 0) > 0) {
        setCommercial([{ id: "com-1", label: "Commercial CAC, Delivery & Return Provision", amount: Number(bd.commercial || bd.other) }]);
      }
    } else if (Number(prod.costTotalPkr || 0) > 0) {
      setFabricItems([{ id: "fab-1", label: "Saved Unit Production Cost", meters: 1, ratePerMeter: Number(prod.costTotalPkr) }]);
      setTrims([]);
      setLabour([]);
      setPackaging([]);
    }

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

  // Margin Health Assessment
  const healthStatus = useMemo(() => {
    if (netMarginPercent < 20) {
      return {
        level: "warning",
        label: "Low Margin (< 20%)",
        color: "#b91c1c",
        bg: "#fef2f2",
        message: "High Risk for E-Commerce: PostEx COD return penalties or unexpected ad spend surges can quickly erase net profit.",
      };
    }
    if (netMarginPercent < 32) {
      return {
        level: "moderate",
        label: "Moderate Margin (20% - 32%)",
        color: "#d97706",
        bg: "#fffbeb",
        message: "Acceptable for high-turnover everyday staples, but leaves narrow cushion for seasonal markdowns or heavy ad scaling.",
      };
    }
    if (netMarginPercent <= 48) {
      return {
        level: "healthy",
        label: "Optimal Commercial Margin (32% - 48%)",
        color: "#15803d",
        bg: "#f0fdf4",
        message: "Ideal Financial Range: Comfortably absorbs 12-15% COD returns, free delivery incentives, and paid digital acquisition.",
      };
    }
    return {
      level: "premium",
      label: "Premium Designer Margin (48%+)",
      color: "#6b21a8",
      bg: "#faf5ff",
      message: "Strong Luxury Margin: Outstanding profitability suitable for bespoke, bridal, and festive formal collections.",
    };
  }, [netMarginPercent]);

  // Copy structured summary in professional English
  function handleCopySummary() {
    const summary = `👗 BUSTANIYA ARTICLE COSTING & PRICING SPECIFICATION
Article Name: ${articleName}
Category: ${articleCategory}

COST ALLOCATION BREAKDOWN (PKR):
• Fabric & Raw Materials: Rs. ${totalFabricCost.toLocaleString()}
• Trims, Laces & Accessories: Rs. ${totalTrimsCost.toLocaleString()}
• Tailoring, Craft & Production Labor: Rs. ${totalLabourCost.toLocaleString()}
• Packaging & Brand Presentation: Rs. ${totalPackagingCost.toLocaleString()}
------------------------------------------------
• Pure Manufacturing Cost (COGS): Rs. ${totalManufacturingCost.toLocaleString()}
• Commercial Overheads (Marketing CAC, Courier, Return Risk): Rs. ${totalCommercialCost.toLocaleString()}
================================================
TOTAL LANDED UNIT COST: Rs. ${totalLandedCost.toLocaleString()}

RETAIL PRICING RECOMMENDATIONS:
• Recommended Retail Selling Price: Rs. ${calculatedSellingPrice.toLocaleString()}
• Compare-at (Crossed-out) MSRP: Rs. ${compareAtPrice.toLocaleString()} (${discountPercent}% OFF)
• Estimated Net Profit: +Rs. ${Math.round(grossProfitPkr).toLocaleString()} per unit
• Net Profit Margin: ${netMarginPercent.toFixed(1)}%
• Markup on Landed Cost: +${markupOnCostPercent.toFixed(1)}%
• Minimum Breakeven Price: Rs. ${breakevenPrice.toLocaleString()}

Generated by Bustaniya Executive Pricing Engine`;

    navigator.clipboard?.writeText(summary);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  }

  // Dynamic row modifiers
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

  function updateItemLabel(setter, id, label) {
    setter((curr) =>
      curr.map((item) => (item.id === id ? { ...item, label } : item))
    );
  }

  function addItem(setter, prefix, defaultLabel, defaultAmount) {
    const newId = `${prefix}-${Date.now()}`;
    setter((curr) => [...curr, { id: newId, label: defaultLabel, amount: defaultAmount }]);
  }

  function removeItem(setter, id) {
    setter((curr) => curr.filter((item) => item.id !== id));
  }

  function handleApply(mode = "auto") {
    if (onApplyToProduct) {
      const targetId = mode === "new" ? null : (selectedProductId || initialProduct?.id || null);
      onApplyToProduct({
        productId: targetId,
        mode,
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
          other: totalCommercialCost,
          landedTotal: totalLandedCost,
        },
      });
    }
  }

  // Percentage cost shares for visual stacked bar
  const costShares = useMemo(() => {
    if (totalLandedCost <= 0) return { fabric: 20, trims: 20, labour: 20, packaging: 20, commercial: 20 };
    return {
      fabric: ((totalFabricCost / totalLandedCost) * 100).toFixed(1),
      trims: ((totalTrimsCost / totalLandedCost) * 100).toFixed(1),
      labour: ((totalLabourCost / totalLandedCost) * 100).toFixed(1),
      packaging: ((totalPackagingCost / totalLandedCost) * 100).toFixed(1),
      commercial: ((totalCommercialCost / totalLandedCost) * 100).toFixed(1),
    };
  }, [totalLandedCost, totalFabricCost, totalTrimsCost, totalLabourCost, totalPackagingCost, totalCommercialCost]);

  return (
    <div className={`articleCalculatorWrapper ${isOpenAsModal ? "isModalWrapper" : ""}`}>
      {/* Top Header Card */}
      <div className="calcHeaderCard">
        <div className="calcHeaderTopRow">
          <div className="calcTitleGroup">
            <div className="calcIconBadge">
              <Calculator size={22} />
            </div>
            <div>
              <div className="calcTitleBadgeRow">
                <h1 className="calcMainTitle">Article Costing & Pricing Engine</h1>
                <span className="calcStudioPill">Apparel Retail Architecture</span>
              </div>
              <p className="calcSubtitle">
                Model exact raw textiles, trims, artisan tailoring, packaging, digital ad CAC, and courier provisions to guarantee sustainable retail margins.
              </p>
            </div>
          </div>

          <div className="calcHeaderActions">
            {products.length > 0 && (
              <div className="calcLoadProductSelectWrap">
                <Tag size={13} className="calcSelectIcon" />
                <select
                  className="calcProductDropdown"
                  value={selectedProductId}
                  onChange={(e) => handleLoadProduct(e.target.value)}
                  aria-label="Load product from catalog"
                >
                  <option value="">+ New Article / Custom Calculation</option>
                  {products.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} ({p.category}) — Rs. {Number(p.price || 0).toLocaleString()} {Number(p.costTotalPkr || 0) ? `[Cost: Rs. ${Number(p.costTotalPkr).toLocaleString()}]` : "[No Cost]"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="calcOutlineBtn"
              onClick={handleCopySummary}
              title="Copy structured costing sheet"
            >
              {copiedNotification ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
              <span>{copiedNotification ? "Copied!" : "Copy Report"}</span>
            </button>

            <button
              type="button"
              className="calcOutlineBtn"
              onClick={() => window.print()}
              title="Print Specification Sheet"
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

        {/* Template Archetype Selector */}
        <div className="calcPresetsRow">
          <span className="calcPresetsLabel">
            <Sparkles size={13} /> Preset Archetypes:
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

      {/* Visual Cost Allocation Progress Bar */}
      <div className="calcVisualShareCard">
        <div className="calcVisualShareHeader">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <BarChart3 size={15} color="#173d29" />
            <span style={{ fontSize: "12px", fontWeight: "750", color: "#173d29" }}>Cost Composition Breakdown</span>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Total Landed Cost: <b style={{ color: "#0f172a" }}>Rs. {totalLandedCost.toLocaleString()}</b>
          </span>
        </div>

        <div className="calcMultiProgressBar">
          <div className="calcProgressSeg segFabric" style={{ width: `${costShares.fabric}%` }} title={`Fabric: ${costShares.fabric}% (Rs. ${totalFabricCost})`} />
          <div className="calcProgressSeg segTrims" style={{ width: `${costShares.trims}%` }} title={`Trims: ${costShares.trims}% (Rs. ${totalTrimsCost})`} />
          <div className="calcProgressSeg segLabour" style={{ width: `${costShares.labour}%` }} title={`Labor: ${costShares.labour}% (Rs. ${totalLabourCost})`} />
          <div className="calcProgressSeg segPackaging" style={{ width: `${costShares.packaging}%` }} title={`Packaging: ${costShares.packaging}% (Rs. ${totalPackagingCost})`} />
          <div className="calcProgressSeg segCommercial" style={{ width: `${costShares.commercial}%` }} title={`Commercial: ${costShares.commercial}% (Rs. ${totalCommercialCost})`} />
        </div>

        <div className="calcLegendGrid">
          <div className="calcLegendItem"><span className="calcLegendDot segFabric" /> Fabric ({costShares.fabric}%)</div>
          <div className="calcLegendItem"><span className="calcLegendDot segTrims" /> Trims &amp; Laces ({costShares.trims}%)</div>
          <div className="calcLegendItem"><span className="calcLegendDot segLabour" /> Stitching &amp; Labor ({costShares.labour}%)</div>
          <div className="calcLegendItem"><span className="calcLegendDot segPackaging" /> Packaging ({costShares.packaging}%)</div>
          <div className="calcLegendItem"><span className="calcLegendDot segCommercial" /> CAC &amp; Delivery ({costShares.commercial}%)</div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="calcMainGrid">
        {/* Left Column: Cost Input Categories */}
        <div className="calcInputsColumn">
          {/* Article Info Header */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <h2 className="calcSectionTitle">
                <Tag size={15} /> Article Identification
              </h2>
            </div>
            <div className="calcFormRow2">
              <div className="calcFormField">
                <label>Article Title / Code</label>
                <input
                  type="text"
                  value={articleName}
                  onChange={(e) => setArticleName(e.target.value)}
                  placeholder="e.g. BST-3012 Luxury Embroidered Lawn"
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
                  <option value="Bottoms">Bottoms &amp; Trousers</option>
                  <option value="Formals">Formals &amp; Luxury Pret</option>
                  <option value="Custom Order">Bespoke Custom Tailored</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: Fabric & Raw Materials */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Scissors size={15} color="#2563eb" /> 1. Fabric &amp; Raw Textiles
                </h2>
                <p className="calcSectionSubtitle">Specify fabric consumption in meters and unit cost per meter.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalFabricCost.toLocaleString()}</span>
            </div>

            <div className="calcTableWrap">
              <table className="calcTable">
                <thead>
                  <tr>
                    <th>Component &amp; Fabric Specification</th>
                    <th style={{ width: "110px" }}>Meters</th>
                    <th style={{ width: "140px" }}>Rate / Meter</th>
                    <th style={{ width: "130px", textAlign: "right" }}>Subtotal</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fabricItems.map((item) => {
                    const rowTotal = Number(item.meters || 0) * Number(item.ratePerMeter || 0);
                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFabricItems((curr) => curr.map((f) => (f.id === item.id ? { ...f, label: val } : f)));
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
                        <td style={{ textAlign: "right", fontWeight: "750", color: "#16452c" }}>
                          Rs. {Math.round(rowTotal).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="calcRowDeleteBtn"
                            onClick={() => removeFabricItem(item.id)}
                            title="Remove fabric line"
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
                  <Layers size={15} color="#7c3aed" /> 2. Embellishments, Laces &amp; Trims
                </h2>
                <p className="calcSectionSubtitle">Laces, border motifs, organza strips, tassels, interlining, and finishing.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalTrimsCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {trims.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItemLabel(setTrims, item.id, e.target.value)}
                      className="calcEditableLabelInput"
                    />
                  </div>
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
                  <button
                    type="button"
                    className="calcRowDeleteBtn"
                    onClick={() => removeItem(setTrims, item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="calcAddRowBtn" onClick={() => addItem(setTrims, "trim", "Additional Trim / Accessory", 100)}>
              <Plus size={13} /> Add Trim Component
            </button>
          </div>

          {/* Section 3: Tailoring, Printing & Craft Labor */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Scissors size={15} color="#d97706" /> 3. Tailoring, Craft &amp; Production Labor
                </h2>
                <p className="calcSectionSubtitle">Master tailor cutting, machine stitching, embroidery craft, and final inspection.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalLabourCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {labour.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItemLabel(setLabour, item.id, e.target.value)}
                      className="calcEditableLabelInput"
                    />
                  </div>
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
                  <button
                    type="button"
                    className="calcRowDeleteBtn"
                    onClick={() => removeItem(setLabour, item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="calcAddRowBtn" onClick={() => addItem(setLabour, "lab", "Additional Labor / Special Process", 150)}>
              <Plus size={13} /> Add Labor Process
            </button>
          </div>

          {/* Section 4: Packaging & Brand Presentation */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Package size={15} color="#0d9488" /> 4. Packaging &amp; Brand Presentation
                </h2>
                <p className="calcSectionSubtitle">Zipper pouches, rigid boxes, woven neck tags, tissue wraps, and cards.</p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalPackagingCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {packaging.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItemLabel(setPackaging, item.id, e.target.value)}
                      className="calcEditableLabelInput"
                    />
                  </div>
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
                  <button
                    type="button"
                    className="calcRowDeleteBtn"
                    onClick={() => removeItem(setPackaging, item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="calcAddRowBtn" onClick={() => addItem(setPackaging, "pkg", "Additional Packaging Item", 50)}>
              <Plus size={13} /> Add Packaging Item
            </button>
          </div>

          {/* Section 5: Commercial Overheads & Logistics Buffer */}
          <div className="calcSectionCard">
            <div className="calcSectionHeader">
              <div>
                <h2 className="calcSectionTitle">
                  <Truck size={15} color="#e11d48" /> 5. Commercial Overheads &amp; Logistics Buffer
                </h2>
                <p className="calcSectionSubtitle">
                  Vital for Cash on Delivery (COD) e-commerce: customer acquisition cost, courier charges, and return risk buffers.
                </p>
              </div>
              <span className="calcSubtotalPill">Rs. {totalCommercialCost.toLocaleString()}</span>
            </div>

            <div className="calcGridRows">
              {commercial.map((item) => (
                <div key={item.id} className="calcGridRowItem">
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateItemLabel(setCommercial, item.id, e.target.value)}
                      className="calcEditableLabelInput"
                    />
                    {item.label.includes("RTO") && (
                      <span className="calcHelperNote">Protects margin against 12% to 15% courier rejection / return rate</span>
                    )}
                    {item.label.includes("CAC") && (
                      <span className="calcHelperNote">Estimated blended paid acquisition ad spend per converted order</span>
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
                  <button
                    type="button"
                    className="calcRowDeleteBtn"
                    onClick={() => removeItem(setCommercial, item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="calcAddRowBtn" onClick={() => addItem(setCommercial, "com", "Additional Commercial Provision", 100)}>
              <Plus size={13} /> Add Commercial Provision
            </button>
          </div>
        </div>

        {/* Right Column: Sticky Pricing Engine & Profitability Simulator */}
        <div className="calcSidebarColumn">
          <div className="calcSummaryStickyCard">
            <div className="calcSummaryHeader">
              <span className="calcSummaryBadge">Pricing Intelligence</span>
              <h3 className="calcSummaryTitle">Financial Feasibility &amp; Margins</h3>
            </div>

            {/* Total Landed Cost Breakdown */}
            <div className="calcCostSummaryBox">
              <div className="calcCostLine">
                <span className="calcCostLabel">
                  <Package size={13} /> Manufacturing Cost (COGS):
                </span>
                <b className="calcCostVal">Rs. {totalManufacturingCost.toLocaleString()}</b>
              </div>
              <div className="calcCostLine">
                <span className="calcCostLabel">
                  <Truck size={13} /> Commercial &amp; Shipping Buffer:
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
              <label className="calcModeLabel">Pricing Calculation Model:</label>
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
                  <Coins size={13} /> Target Profit
                </button>
                <button
                  type="button"
                  className={`calcModeBtn ${pricingMode === "manual_price" ? "active" : ""}`}
                  onClick={() => setPricingMode("manual_price")}
                >
                  <Tag size={13} /> Custom Price
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
                  <label className="calcModeSubLabel">Target Net Profit per Unit (PKR):</label>
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
                  <label className="calcModeSubLabel">Intended Retail Price (PKR):</label>
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

              {/* Psychological Charm Pricing Toggle */}
              <div className="calcCharmPricingRow">
                <label className="calcCharmCheckboxLabel">
                  <input
                    type="checkbox"
                    checked={charmPricing}
                    onChange={(e) => setCharmPricing(e.target.checked)}
                  />
                  <span>
                    <b>Psychological Charm Rounding</b>
                    <small>Auto-format endings to .990 or .490 (e.g. Rs. 4,990 / Rs. 5,490)</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Calculated Retail Price Hero Card */}
            <div className="calcRetailResultCard">
              <span className="calcRetailLabel">Recommended Retail Price</span>
              <div className="calcRetailPriceDisplay">
                <span className="calcPkrSymbol">Rs.</span>
                <span className="calcPkrAmount">{calculatedSellingPrice.toLocaleString()}</span>
              </div>

              {/* Compare-at Strike-Through Section */}
              <div className="calcCompareRow">
                <div>
                  <span className="calcCompareSubLabel">Compare-at (MSRP):</span>
                  <div className="calcComparePillBox">
                    <del className="calcCompareCrossed">Rs. {compareAtPrice.toLocaleString()}</del>
                    <span className="calcDiscountBadge">{discountPercent}% OFF</span>
                  </div>
                </div>

                <div className="calcDiscountSelectWrap">
                  <label>Display Discount</label>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="calcSmallSelect"
                  >
                    <option value="10">10% OFF</option>
                    <option value="15">15% OFF</option>
                    <option value="20">20% OFF</option>
                    <option value="25">25% OFF</option>
                    <option value="30">30% OFF</option>
                    <option value="35">35% OFF</option>
                  </select>
                </div>
              </div>

              {customerSavingsPkr > 0 && (
                <p className="calcCustomerPerception">
                  ✨ Website customer perceives a discount saving of <b>Rs. {customerSavingsPkr.toLocaleString()}</b>
                </p>
              )}
            </div>

            {/* Profit & Margin KPI Metrics */}
            <div className="calcProfitKpiGrid">
              <div className="calcKpiCard">
                <span className="calcKpiLabel">Net Profit / Unit</span>
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
                <span className="calcKpiLabel">Breakeven Price</span>
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

            {/* Primary Action Buttons */}
            <div className="calcActionButtonsGroup">
              {onApplyToProduct && (
                <>
                  <button
                    type="button"
                    className="calcApplyBtn"
                    onClick={() => handleApply("auto")}
                  >
                    <Check size={16} />
                    {selectedProductId
                      ? `Save Cost & Price to "${articleName.slice(0, 26)}${articleName.length > 26 ? "..." : ""}"`
                      : "Apply Pricing to Product"}
                  </button>
                  {selectedProductId && !isOpenAsModal && (
                    <button
                      type="button"
                      className="calcCopyBtn"
                      onClick={() => handleApply("new")}
                    >
                      <Plus size={15} /> Create as New Catalog Product
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                className="calcCopyBtn"
                onClick={handleCopySummary}
              >
                {copiedNotification ? <Check size={16} /> : <Copy size={16} />}
                {copiedNotification ? "Copied to Clipboard!" : "Copy Full Specification"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Styled JSX */}
      <style jsx>{`
        .articleCalculatorWrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #0f172a;
          font-family: inherit;
        }

        .articleCalculatorWrapper.isModalWrapper {
          max-height: 85vh;
          overflow-y: auto;
          padding: 8px 4px;
        }

        /* Top Header Card */
        .calcHeaderCard {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 22px 26px;
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
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0f291e 0%, #17422b 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(15, 41, 30, 0.2);
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
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .calcStudioPill {
          font-size: 11px;
          font-weight: 700;
          background: #f1f5f9;
          color: #0f766e;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 3px 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .calcSubtitle {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #64748b;
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
          color: #64748b;
          pointer-events: none;
        }

        .calcProductDropdown {
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 12px 8px 30px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcProductDropdown:focus {
          border-color: #0f766e;
          background: #ffffff;
        }

        .calcOutlineBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcOutlineBtn:hover {
          background: #f8fafc;
          border-color: #0f766e;
          color: #0f766e;
        }

        .calcCloseModalBtn {
          border: none;
          background: #f1f5f9;
          color: #475569;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .calcCloseModalBtn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Preset Archetypes */
        .calcPresetsRow {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .calcPresetsLabel {
          font-size: 11.5px;
          font-weight: 800;
          color: #475569;
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
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all 0.15s ease;
        }

        .calcPresetPill:hover {
          border-color: #0f766e;
          background: #f0fdfa;
        }

        .calcPresetPill.active {
          background: #0f291e;
          color: #ffffff;
          border-color: #0f291e;
          box-shadow: 0 2px 6px rgba(15, 41, 30, 0.25);
        }

        .presetPillName {
          font-size: 12px;
          font-weight: 750;
        }

        .presetPillTagline {
          font-size: 10px;
          opacity: 0.8;
        }

        /* Visual Cost Allocation Progress Bar */
        .calcVisualShareCard {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 14px 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .calcVisualShareHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .calcMultiProgressBar {
          height: 10px;
          border-radius: 999px;
          background: #f1f5f9;
          display: flex;
          overflow: hidden;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .calcProgressSeg {
          height: 100%;
          transition: width 0.3s ease;
        }

        .segFabric {
          background: #3b82f6;
        }

        .segTrims {
          background: #8b5cf6;
        }

        .segLabour {
          background: #f59e0b;
        }

        .segPackaging {
          background: #0d9488;
        }

        .segCommercial {
          background: #f43f5e;
        }

        .calcLegendGrid {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 11.5px;
          font-weight: 600;
          color: #475569;
        }

        .calcLegendItem {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .calcLegendDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        /* 2-Column Grid */
        .calcMainGrid {
          display: grid;
          grid-template-columns: 1fr 430px;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1150px) {
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
          border: 1px solid #e2e8f0;
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
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .calcSectionSubtitle {
          margin: 3px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .calcSubtotalPill {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f766e;
          background: #f0fdfa;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #ccfbf1;
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
          color: #334155;
        }

        .calcInputText,
        .calcInputSelect {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .calcInputText:focus,
        .calcInputSelect:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        /* Fabric Table */
        .calcTableWrap {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .calcTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .calcTable th {
          background: #f8fafc;
          color: #475569;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .calcTable td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .calcTableRowInput {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          padding: 6px 8px;
          border-radius: 6px;
          outline: none;
        }

        .calcTableRowInput:focus {
          background: #ffffff;
          border-color: #0f766e;
        }

        .calcInputUnitWrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
        }

        .calcUnitTag {
          position: absolute;
          right: 8px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          pointer-events: none;
        }

        .calcCurrencyPrefix {
          padding-left: 8px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 700;
        }

        .calcTableNumberInput {
          width: 100%;
          border: none;
          background: transparent;
          padding: 6px 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }

        .calcRowDeleteBtn {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .calcRowDeleteBtn:hover {
          color: #e11d48;
          background: #ffe4e6;
        }

        .calcAddRowBtn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 7px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          color: #0f766e;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcAddRowBtn:hover {
          border-color: #0f766e;
          background: #f0fdfa;
        }

        /* Generic Cost Grid Rows */
        .calcGridRows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .calcGridRowItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .calcEditableLabelInput {
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          padding: 4px 6px;
          border-radius: 5px;
          outline: none;
        }

        .calcEditableLabelInput:focus {
          background: #ffffff;
          border-color: #0f766e;
        }

        .calcHelperNote {
          display: block;
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
          padding-left: 6px;
        }

        .calcCurrencyInputBox {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0 4px;
          width: 140px;
          flex-shrink: 0;
        }

        .calcCurrencyInputBox:focus-within {
          border-color: #0f766e;
          box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.1);
        }

        .calcCurrencyInputBox input {
          width: 100%;
          border: none;
          padding: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
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
          border: 1px solid #e2e8f0;
          padding: 22px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .calcSummaryHeader {
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .calcSummaryBadge {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0f766e;
          background: #f0fdfa;
          padding: 3px 8px;
          border-radius: 5px;
        }

        .calcSummaryTitle {
          margin: 6px 0 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        /* Cost Summary Line Box */
        .calcCostSummaryBox {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
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
          color: #475569;
        }

        .calcCostLabel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .calcCostVal {
          color: #0f172a;
          font-weight: 700;
        }

        .calcCostDivider {
          height: 1px;
          background: #e2e8f0;
          margin: 2px 0;
        }

        .calcTotalCostLine {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 750;
          color: #0f172a;
        }

        .calcTotalCostPill {
          background: #0f291e;
          color: #ffffff;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 800;
        }

        /* Pricing Mode Selector */
        .calcPricingModeSection {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .calcModeLabel {
          font-size: 11.5px;
          font-weight: 750;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .calcModeToggleGroup {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4px;
          background: #f1f5f9;
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
          color: #64748b;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcModeBtn.active {
          background: #ffffff;
          color: #0f291e;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .calcModeControlBox {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
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
          color: #334155;
        }

        .calcSliderValBadge {
          background: #0f291e;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .calcSlider {
          width: 100%;
          accent-color: #0f766e;
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
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          text-align: center;
        }

        .calcQuickPill.active {
          background: #0f291e;
          color: #ffffff;
          border-color: #0f291e;
        }

        .calcModeSubLabel {
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
        }

        /* Charm Pricing Toggle */
        .calcCharmPricingRow {
          padding-top: 4px;
        }

        .calcCharmCheckboxLabel {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          color: #334155;
        }

        .calcCharmCheckboxLabel input {
          margin-top: 2px;
          accent-color: #0f766e;
        }

        .calcCharmCheckboxLabel span {
          display: flex;
          flex-direction: column;
        }

        .calcCharmCheckboxLabel small {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        /* Retail Hero Card */
        .calcRetailResultCard {
          background: linear-gradient(135deg, #091e14 0%, #133a25 100%);
          border-radius: 12px;
          padding: 16px 18px;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(15, 41, 30, 0.25);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .calcRetailLabel {
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #a7f3d0;
        }

        .calcRetailPriceDisplay {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .calcPkrSymbol {
          font-size: 18px;
          font-weight: 600;
          color: #d1fae5;
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
          color: #d1fae5;
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
          background: #e11d48;
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
          color: #d1fae5;
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
          color: #0f172a;
          background: #ffffff;
        }

        .calcCustomerPerception {
          margin: 0;
          font-size: 11.5px;
          line-height: 1.4;
          color: #d1fae5;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .calcKpiLabel {
          font-size: 11px;
          font-weight: 650;
          color: #64748b;
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
          color: #e11d48;
        }

        .calcKpiVal.neutral {
          color: #0f172a;
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
          background: #0f291e;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(15, 41, 30, 0.2);
        }

        .calcApplyBtn:hover {
          background: #17422b;
        }

        .calcCopyBtn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .calcCopyBtn:hover {
          background: #f8fafc;
          border-color: #0f766e;
          color: #0f766e;
        }
      `}</style>
    </div>
  );
}
