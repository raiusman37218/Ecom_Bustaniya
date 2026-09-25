"use client";

import { useState } from "react";
import {
  Scissors,
  UploadCloud,
  CheckCircle2,
  Ruler,
  HelpCircle,
  X,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Truck,
  ArrowRight,
  ArrowLeft,
  Info,
  Layers,
  Check,
  Camera,
  Shirt,
  HeartHandshake,
  Clock,
  Copy,
  ChevronDown,
} from "lucide-react";

const OUTFIT_TYPES = [
  {
    id: "3 Piece",
    label: "3-Piece Complete Suit",
    urdu: "قمیض + شلوار/ٹراؤزر + دوپٹہ",
    desc: "Shirt, bottom & matching dupatta tailored to perfection",
    tag: "Most Popular",
  },
  {
    id: "2 Piece",
    label: "2-Piece Suit (Kurti & Bottom)",
    urdu: "قمیض + شلوار یا ٹراؤزر",
    desc: "Co-ordinated shirt and trouser/shalwar",
    tag: "Essential",
  },
  {
    id: "Kurti",
    label: "Kurti / Shirt Only",
    urdu: "سنگل قمیض / کرتی",
    desc: "Single top, tunic, or statement kurti",
    tag: "Signature Cut",
  },
  {
    id: "Maxi / Frock",
    label: "Maxi / Anarkali / Frock",
    urdu: "میکسی / انارکلی / فراک",
    desc: "Flared silhouette, gown, or floor-length anarkali",
    tag: "Festive & Party",
  },
  {
    id: "Lehenga",
    label: "Lehenga / Sharara / Formal",
    urdu: "لہنگا / شرارہ / غرارہ",
    desc: "Festive or bridal formal wear with intricate detailing",
    tag: "Luxury Formal",
  },
  {
    id: "Other",
    label: "Custom Cut / Modern Silhouette",
    urdu: "کسٹم ڈیزائن / خاص اسٹائل",
    desc: "Cape, kaftan, co-ord set, or unique bespoke cut",
    tag: "Bespoke",
  },
];

const PRESET_COLORS = [
  { name: "Ivory Off-White", hex: "#FAF6EE", border: "#E0D7C5" },
  { name: "Emerald Green", hex: "#15432B", border: "#15432B" },
  { name: "Ruby Crimson", hex: "#A31638", border: "#A31638" },
  { name: "Powder Blue", hex: "#BDD3E8", border: "#9FBBD6" },
  { name: "Dusty Blush", hex: "#E8B7BD", border: "#CCA0A6" },
  { name: "Champagne Gold", hex: "#D6B876", border: "#BF9F59" },
  { name: "Midnight Black", hex: "#1C1C1C", border: "#1C1C1C" },
  { name: "Royal Plum", hex: "#52234B", border: "#52234B" },
  { name: "Terracotta Rust", hex: "#BC593E", border: "#A84C34" },
  { name: "Mustard Gold", hex: "#D8A33E", border: "#C08E2D" },
];

const STANDARD_SIZES = [
  { id: "XS", label: "XS (Extra Small)", chest: "34", waist: "28", hips: "36" },
  { id: "S", label: "S (Small)", chest: "36", waist: "30", hips: "38" },
  { id: "M", label: "M (Medium)", chest: "39", waist: "33", hips: "41" },
  { id: "L", label: "L (Large)", chest: "42", waist: "36", hips: "44" },
  { id: "XL", label: "XL (Extra Large)", chest: "45", waist: "39", hips: "47" },
  { id: "XXL", label: "XXL", chest: "48", waist: "42", hips: "50" },
];

const BOTTOM_STYLES = [
  "Straight Trouser",
  "Cigarette Pants",
  "Classic Shalwar",
  "Tulip Shalwar",
  "Capri Pants",
  "Bell Bottom / Flared",
  "Gharara / Sharara",
  "Culottes",
];

const FABRIC_ARRANGEMENTS = [
  {
    id: "Bustaniya Provides Fabric",
    title: "Fabric Provided by Bustaniya",
    desc: "We source authentic high-grade Pakistani lawn, cotton, pure raw silk, organza, or velvet based on your preference.",
    badge: "Recommended & Full Service",
  },
  {
    id: "Client Fabric (Stitching Only)",
    title: "I will provide my own fabric",
    desc: "You send your unstitched fabric / suit to our workshop, and our master tailors stitch it to your exact specifications.",
    badge: "Stitching Only",
  },
];

const POPULAR_FABRICS = [
  "Summer Lawn",
  "Premium Cotton",
  "Pure Raw Silk",
  "Chiffon / Georgette",
  "Organza",
  "Banarsi / Jacquard",
  "Velvet",
  "Linen / Khaddar",
];

const NECKLINE_STYLES = [
  "Boat Neck (کشتی گلا)",
  "V-Neck with Slit (وی کٹ)",
  "Round with Piping (گول گلا)",
  "Ban / Chinese Collar (بین گلا)",
  "Angrakha Wrap",
  "Square Neck (چکور گلا)",
  "As in Reference Photo",
];

const SLEEVE_STYLES = [
  "Full Sleeves (پورے بازو)",
  "3/4 Sleeves",
  "Bell / Flared Sleeves (بیل باٹم)",
  "Cuff with Pearl Buttons",
  "Sleeveless",
  "As in Reference Photo",
];

const DAMAN_STYLES = [
  "Straight Daman (سیدھا دامن)",
  "Curved / Round Daman (گول دامن)",
  "Organza / Lace Cutwork Border",
  "High-Low Hemline",
  "As in Reference Photo",
];

const LINING_OPTIONS = [
  "No Lining Required",
  "Full Shirt Cotton Malmal Lining",
  "Full Shirt Silk Lining",
  "Body Lined, Sheer Sleeves",
];

const FITTING_PREFERENCES = [
  { id: "regular", label: "Regular Comfort Fit", desc: "Easy, graceful standard fit" },
  { id: "tailored", label: "Smart Tailored Fit", desc: "Clean shape along waist & chest" },
  { id: "relaxed", label: "Relaxed / Loose Fit", desc: "Modest, breezy A-line flow" },
];

const POPULAR_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Sialkot",
  "Gujranwala",
  "Quetta",
  "Overseas / International",
];

export default function CustomOrderClient({ storeSettings }) {
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("inches");
  const [sizePreference, setSizePreference] = useState("custom"); // "custom" | "standard"
  const [standardSize, setStandardSize] = useState("M");
  const [fittingPref, setFittingPref] = useState("regular");

  // Dress details
  const [dressType, setDressType] = useState("3 Piece");
  const [fabricArrangement, setFabricArrangement] = useState(FABRIC_ARRANGEMENTS[0].id);
  const [fabricType, setFabricType] = useState("Summer Lawn");
  const [colorPreference, setColorPreference] = useState("");
  const [selectedColorHex, setSelectedColorHex] = useState(null);

  // Quick design selections
  const [necklineStyle, setNecklineStyle] = useState("As in Reference Photo");
  const [sleeveStyle, setSleeveStyle] = useState("Full Sleeves (پورے بازو)");
  const [damanStyle, setDamanStyle] = useState("Straight Daman (سیدھا دامن)");
  const [liningOption, setLiningOption] = useState("No Lining Required");
  const [bottomStyle, setBottomStyle] = useState("Straight Trouser");

  // Reference images
  const [referenceImages, setReferenceImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Detailed measurements
  const [measurements, setMeasurements] = useState({
    shirtLength: "",
    chest: "",
    waist: "",
    hips: "",
    shoulder: "",
    sleevesLength: "",
    armhole: "",
    neckDepth: "",
    bottomLength: "",
    bottomWaist: "",
    thigh: "",
    bottomOpening: "",
    additionalNotes: "",
  });

  const [designNotes, setDesignNotes] = useState("");

  // Customer Contact
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCity, setCustomerCity] = useState("Lahore");
  const [customerAddress, setCustomerAddress] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Guide modal
  const [showGuide, setShowGuide] = useState(false);

  const whatsappSupportNumber = storeSettings?.whatsappSupportNumber || "923000000000";

  function handleMeasurementChange(field, value) {
    setMeasurements((prev) => ({ ...prev, [field]: value }));
  }

  function handleSelectColor(color) {
    setSelectedColorHex(color.hex);
    setColorPreference(color.name);
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (referenceImages.length + files.length > 6) {
      setUploadError("You can upload a maximum of 6 reference photos.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/custom-order/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload reference images.");
      }

      if (Array.isArray(data.urls)) {
        setReferenceImages((prev) => [...prev, ...data.urls]);
      }
    } catch (err) {
      setUploadError(err.message || "Failed to upload photos.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleRemoveImage(index) {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCopyOrderNumber(orderNum) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(orderNum);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  async function handleSubmitOrder(e) {
    e.preventDefault();
    if (!customerName.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      setSubmitError("Please enter a valid WhatsApp phone number so we can message you with the price quote.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const compiledDesignNotes = [
        designNotes.trim() ? `Personal Notes: ${designNotes.trim()}` : "",
        `Neckline: ${necklineStyle}`,
        `Sleeves: ${sleeveStyle}`,
        `Daman: ${damanStyle}`,
        `Lining: ${liningOption}`,
        `Fitting Preference: ${fittingPref}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const payload = {
        customerName,
        customerPhone,
        customerEmail,
        customerCity,
        customerAddress,
        dressType,
        sizePreference,
        standardSize: sizePreference === "standard" ? standardSize : null,
        fabricDetails: `${fabricArrangement} — ${fabricType}`,
        colorPreference: colorPreference.trim() || "As per reference photo",
        designNotes: compiledDesignNotes,
        referenceImages,
        measurements: {
          unit,
          bottomStyle,
          fittingPref,
          necklineStyle,
          sleeveStyle,
          damanStyle,
          liningOption,
          ...measurements,
        },
      };

      const res = await fetch("/api/custom-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request. Please try again.");
      }

      setCreatedOrder(data.order || { order_number: data.orderNumber });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err.message || "Error submitting custom dress order.");
    } finally {
      setSubmitting(false);
    }
  }

  const orderNum = createdOrder?.order_number || createdOrder?.orderNumber || "BST-CD";
  const whatsappConfirmHref = createdOrder
    ? `https://wa.me/${whatsappSupportNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Assalam-o-Alaikum Bustaniya! 🌸 Maine abhi website par Custom Dress Request submit ki hai.\n\n` +
          `📋 Order Request: ${orderNum}\n` +
          `👗 Dress: ${dressType}\n` +
          `🎨 Color: ${colorPreference || "Custom"}\n\n` +
          `Bara-e-meharbani mera design review karein aur price quote provide karein. Shukriya!`
      )}`
    : "#";

  return (
    <div className="customOrderContainer">
      {/* 1. Haute Couture Editorial Header */}
      <header className="customOrderHero">
        <div className="customOrderHeroContent">
          <div className="bespokePill">
            <Sparkles size={13} className="pillSparkle" />
            <span>BUSTANIYA BESPOKE ATELIER • MADE-TO-MEASURE</span>
          </div>
          <h1>Crafted to Your Exact Silhouette</h1>
          <p className="heroSubtext">
            Upload your dream design, share your body measurements, and let our master artisans tailor it to perfection. We confirm every detail and provide a price quote directly on WhatsApp.
          </p>

          <div className="customOrderPillars">
            <div className="pillarItem">
              <div className="pillarIconWrap">
                <Ruler size={18} />
              </div>
              <div>
                <b>Perfect Custom Fit</b>
                <span>Tailored to your exact body measurements</span>
              </div>
            </div>
            <div className="pillarItem">
              <div className="pillarIconWrap">
                <MessageSquare size={18} />
              </div>
              <div>
                <b>WhatsApp Consultation</b>
                <span>Price & fabric quote confirmed within 2–4 hours</span>
              </div>
            </div>
            <div className="pillarItem">
              <div className="pillarIconWrap">
                <Truck size={18} />
              </div>
              <div>
                <b>Nationwide COD Delivery</b>
                <span>Cash on delivery available all across Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Success Screen if already submitted */}
      {createdOrder ? (
        <section className="customOrderSuccessCard" aria-live="polite">
          <div className="successBadgeWrap">
            <div className="successSeal">
              <CheckCircle2 size={40} className="successIcon" />
            </div>
          </div>

          <span className="successEyebrow">REQUEST RECEIVED</span>
          <h2>Your Custom Dress Order is in Review!</h2>
          <p className="successSub">
            Thank you, <b>{customerName}</b>. Our master tailor and styling consultants have received your design.
          </p>

          <div className="orderRefTicket">
            <div className="ticketHeader">
              <span>Order Request ID</span>
              <button
                type="button"
                className="btnCopyTicket"
                onClick={() => handleCopyOrderNumber(orderNum)}
                title="Copy Order ID"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="ticketCode">{orderNum}</div>
            <div className="ticketSummaryRow">
              <span>Outfit: <b>{dressType}</b></span>
              <span>Size: <b>{sizePreference === "custom" ? "Custom Naap" : `Standard ${standardSize}`}</b></span>
              <span>City: <b>{customerCity}</b></span>
            </div>
          </div>

          <div className="nextStepsTimeline">
            <h4>What happens next?</h4>
            <div className="timelineSteps">
              <div className="tStep">
                <div className="tStepNum">1</div>
                <div>
                  <b>Master Tailor Inspection</b>
                  <p>Our team reviews your uploaded reference photos and measurements.</p>
                </div>
              </div>
              <div className="tStep">
                <div className="tStepNum">2</div>
                <div>
                  <b>WhatsApp Price Quote</b>
                  <p>We send you fabric options, stitching estimate, and exact price on <strong>{customerPhone}</strong>.</p>
                </div>
              </div>
              <div className="tStep">
                <div className="tStepNum">3</div>
                <div>
                  <b>Handcrafted & Dispatched</b>
                  <p>Once you approve, stitching begins with rigorous quality checks.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="successActions">
            <a
              href={whatsappConfirmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btnWhatsAppDirect"
            >
              <img src="/whatsapp-icon.png" alt="WhatsApp" width={22} height={22} />
              <span>Connect on WhatsApp Now</span>
              <ArrowRight size={17} />
            </a>
            <a href="/" className="btnBackToStore">
              Back to Bustaniya Store
            </a>
          </div>
        </section>
      ) : (
        /* 3. Multi-Step Interactive Form */
        <form className="customOrderFormShell" onSubmit={handleSubmitOrder} noValidate>
          {/* Step Progress Stepper */}
          <nav className="customFormStepsNav" aria-label="Custom Order Steps">
            <button
              type="button"
              className={`stepTabBtn ${step === 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}
              onClick={() => setStep(1)}
            >
              <span className="stepNumber">{step > 1 ? <Check size={13} /> : "1"}</span>
              <div className="stepMeta">
                <span className="stepMetaLabel">Step 1</span>
                <span className="stepTitle">Style & Fabric</span>
              </div>
            </button>

            <button
              type="button"
              className={`stepTabBtn ${step === 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}
              onClick={() => setStep(2)}
            >
              <span className="stepNumber">{step > 2 ? <Check size={13} /> : "2"}</span>
              <div className="stepMeta">
                <span className="stepMetaLabel">Step 2</span>
                <span className="stepTitle">Design & Photos</span>
              </div>
            </button>

            <button
              type="button"
              className={`stepTabBtn ${step === 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}
              onClick={() => setStep(3)}
            >
              <span className="stepNumber">{step > 3 ? <Check size={13} /> : "3"}</span>
              <div className="stepMeta">
                <span className="stepMetaLabel">Step 3</span>
                <span className="stepTitle">Measurements</span>
              </div>
            </button>

            <button
              type="button"
              className={`stepTabBtn ${step === 4 ? "active" : ""}`}
              onClick={() => setStep(4)}
            >
              <span className="stepNumber">4</span>
              <div className="stepMeta">
                <span className="stepMetaLabel">Step 4</span>
                <span className="stepTitle">Review & Confirm</span>
              </div>
            </button>
          </nav>

          {/* STEP 1: Outfit Type, Fabric & Color */}
          {step === 1 && (
            <div className="formStepSection animateFadeIn">
              <div className="stepHead">
                <span className="stepSuper">STEP 01 / 04</span>
                <h3>Select Your Outfit & Fabric Preferences</h3>
                <p>Choose the dress type and tell us how you would like the fabric arranged.</p>
              </div>

              {/* Outfit Types */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">
                  1. What would you like us to craft? <span className="reqStar">*</span>
                </label>
                <div className="outfitTypeGrid">
                  {OUTFIT_TYPES.map((type) => {
                    const isSelected = dressType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className={`outfitChoiceCard ${isSelected ? "selected" : ""}`}
                        onClick={() => setDressType(type.id)}
                      >
                        <div className="cardTopRow">
                          <span className="outfitIconWrap">
                            <Scissors size={18} />
                          </span>
                          {type.tag && <span className="outfitTag">{type.tag}</span>}
                        </div>
                        <b className="outfitTitle">{type.label}</b>
                        <span className="outfitUrdu">{type.urdu}</span>
                        <p className="outfitDesc">{type.desc}</p>
                        {isSelected && (
                          <span className="selectedCheck">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fabric Source Selection */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">
                  2. Fabric Sourcing <span className="reqStar">*</span>
                </label>
                <div className="fabricChoiceCardsGrid">
                  {FABRIC_ARRANGEMENTS.map((item) => {
                    const isSelected = fabricArrangement === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`fabricChoiceCard ${isSelected ? "selected" : ""}`}
                        onClick={() => setFabricArrangement(item.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="fabricCardRadio">
                          <input
                            type="radio"
                            name="fabricArrangement"
                            checked={isSelected}
                            onChange={() => setFabricArrangement(item.id)}
                          />
                        </div>
                        <div className="fabricCardContent">
                          <div className="fabricCardTitleRow">
                            <strong>{item.title}</strong>
                            <span className="fabricBadge">{item.badge}</span>
                          </div>
                          <p>{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Fabric Texture */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">3. Preferred Fabric Material</label>
                <div className="chipWrap">
                  {POPULAR_FABRICS.map((fab) => (
                    <button
                      key={fab}
                      type="button"
                      className={`chipBtn ${fabricType === fab ? "active" : ""}`}
                      onClick={() => setFabricType(fab)}
                    >
                      {fab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Color Swatches & Custom Input */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">4. Preferred Color & Shade</label>
                <p className="fieldSubDesc">
                  Click a popular shade below, or type your exact color preference (e.g. Sage Green, Tea Pink, Off-white with gold accents).
                </p>

                <div className="colorSwatchesRail" aria-label="Popular colors">
                  {PRESET_COLORS.map((clr) => {
                    const isSelected = colorPreference === clr.name;
                    return (
                      <button
                        key={clr.name}
                        type="button"
                        className={`colorSwatchDot ${isSelected ? "active" : ""}`}
                        style={{
                          backgroundColor: clr.hex,
                          borderColor: clr.border,
                        }}
                        onClick={() => handleSelectColor(clr)}
                        title={clr.name}
                        aria-label={clr.name}
                      >
                        {isSelected && (
                          <Check
                            size={14}
                            className="swatchCheck"
                            style={{
                              color: ["#FAF6EE", "#BDD3E8", "#E8B7BD", "#D6B876"].includes(clr.hex)
                                ? "#143D29"
                                : "#FFFFFF",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="colorInputWrap">
                  <input
                    type="text"
                    className="customFormInput"
                    value={colorPreference}
                    onChange={(e) => {
                      setColorPreference(e.target.value);
                      setSelectedColorHex(null);
                    }}
                    placeholder="Enter color name or description (e.g. Powder Blue, Emerald Green, Off-White...)"
                  />
                </div>
              </div>

              <div className="stepNavButtons">
                <span />
                <button type="button" className="btnNextStep" onClick={() => setStep(2)}>
                  <span>Next: Reference Photos & Design</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Reference Photos & Design Styling */}
          {step === 2 && (
            <div className="formStepSection animateFadeIn">
              <div className="stepHead">
                <span className="stepSuper">STEP 02 / 04</span>
                <h3>Upload Reference Photos & Design Details</h3>
                <p>
                  Share screenshots from Pinterest, Instagram, or photos of dresses you love. You can also pick common design options below.
                </p>
              </div>

              {/* Photo Upload Area */}
              <div className="formFieldGroup">
                <div className="labelWithBadge">
                  <label className="fieldMainLabel">
                    1. Reference Inspiration Photos <span className="labelCounter">({referenceImages.length}/6 photos)</span>
                  </label>
                  <span className="tipBadge">Screenshots from Instagram/Pinterest welcome</span>
                </div>

                <div className="uploadDropzone">
                  <input
                    type="file"
                    id="refPhotos"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="fileInputHidden"
                  />
                  <label htmlFor="refPhotos" className="uploadTrigger">
                    <div className="uploadIconBubble">
                      <Camera size={24} />
                    </div>
                    <b>Click or drag & drop reference images</b>
                    <span>Upload front, back, sleeves or neckline closeups (PNG, JPG, WEBP up to 10MB)</span>
                  </label>
                </div>

                {uploading && (
                  <div className="uploadingIndicator">
                    <span className="spinner" />
                    <span>Uploading photos securely, please wait...</span>
                  </div>
                )}
                {uploadError && <p className="fieldErrorText">{uploadError}</p>}

                {/* Previews Grid */}
                {referenceImages.length > 0 && (
                  <div className="uploadedPhotosGrid">
                    {referenceImages.map((url, idx) => (
                      <div className="uploadedPhotoThumb" key={idx}>
                        <img src={url} alt={`Reference inspiration ${idx + 1}`} />
                        <span className="photoIndexBadge">#{idx + 1}</span>
                        <button
                          type="button"
                          className="btnRemoveThumb"
                          onClick={() => handleRemoveImage(idx)}
                          aria-label="Remove image"
                          title="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Design Feature Selectors */}
              <div className="designFeatureSection">
                <div className="featureSectionTitle">
                  <Sparkles size={16} />
                  <span>2. Design & Styling Specifications</span>
                </div>

                <div className="featureSelectorsGrid">
                  {/* Neckline */}
                  <div className="featureSelectCard">
                    <label>Neckline Style (گلا)</label>
                    <div className="featurePills">
                      {NECKLINE_STYLES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={`featurePill ${necklineStyle === st ? "active" : ""}`}
                          onClick={() => setNecklineStyle(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sleeves */}
                  <div className="featureSelectCard">
                    <label>Sleeve Cut (بازو)</label>
                    <div className="featurePills">
                      {SLEEVE_STYLES.map((sl) => (
                        <button
                          key={sl}
                          type="button"
                          className={`featurePill ${sleeveStyle === sl ? "active" : ""}`}
                          onClick={() => setSleeveStyle(sl)}
                        >
                          {sl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Daman / Hem */}
                  <div className="featureSelectCard">
                    <label>Daman / Hemline (دامن)</label>
                    <div className="featurePills">
                      {DAMAN_STYLES.map((dm) => (
                        <button
                          key={dm}
                          type="button"
                          className={`featurePill ${damanStyle === dm ? "active" : ""}`}
                          onClick={() => setDamanStyle(dm)}
                        >
                          {dm}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lining (Astar) */}
                  <div className="featureSelectCard">
                    <label>Inner Lining (استر)</label>
                    <div className="featurePills">
                      {LINING_OPTIONS.map((ln) => (
                        <button
                          key={ln}
                          type="button"
                          className={`featurePill ${liningOption === ln ? "active" : ""}`}
                          onClick={() => setLiningOption(ln)}
                        >
                          {ln}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Personal Notes */}
              <div className="formFieldGroup" style={{ marginTop: 24 }}>
                <label className="fieldMainLabel" htmlFor="designNotes">
                  3. Specific Personal Instructions & Detailing
                </label>
                <textarea
                  id="designNotes"
                  className="customFormTextarea"
                  rows={4}
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                  placeholder="e.g. Please add delicate organza border on sleeves, loop buttons on neck, lightweight cotton lining inside, and keep the chaak / slits at 14 inches..."
                />
                <small className="fieldHint">
                  Har choti bari detail likhein jaise button style, lace finish, embroidery placement waghera.
                </small>
              </div>

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btnNextStep" onClick={() => setStep(3)}>
                  <span>Next: Size & Measurements</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Detailed Measurements */}
          {step === 3 && (
            <div className="formStepSection animateFadeIn">
              <div className="stepHeadWithAction">
                <div>
                  <span className="stepSuper">STEP 03 / 04</span>
                  <h3>Size & Body Measurements</h3>
                  <p>Choose your sizing method. Accurate measurements guarantee a bespoke, flattering fit.</p>
                </div>
                <button
                  type="button"
                  className="btnOpenGuide"
                  onClick={() => setShowGuide(true)}
                >
                  <HelpCircle size={16} />
                  <span>How to measure guide</span>
                </button>
              </div>

              {/* Size Mode Selector */}
              <div className="sizeModeToggleRow">
                <button
                  type="button"
                  className={`sizeModeBtn ${sizePreference === "custom" ? "active" : ""}`}
                  onClick={() => setSizePreference("custom")}
                >
                  <div className="sizeModeIconWrap">
                    <Ruler size={20} />
                  </div>
                  <div>
                    <b>Custom Exact Measurements (Recommended)</b>
                    <span>Tailored to your body naap for the most flattering fit</span>
                  </div>
                  {sizePreference === "custom" && <span className="modeCheck"><Check size={14} /></span>}
                </button>

                <button
                  type="button"
                  className={`sizeModeBtn ${sizePreference === "standard" ? "active" : ""}`}
                  onClick={() => setSizePreference("standard")}
                >
                  <div className="sizeModeIconWrap">
                    <Layers size={20} />
                  </div>
                  <div>
                    <b>Standard Ready-to-Wear Size</b>
                    <span>Select S, M, L, XL with option to customize length</span>
                  </div>
                  {sizePreference === "standard" && <span className="modeCheck"><Check size={14} /></span>}
                </button>
              </div>

              {/* Fitting Silhouette Preference */}
              <div className="fittingPrefBlock">
                <label className="fieldMainLabel">Fitting Cut Preference</label>
                <div className="fittingGrid">
                  {FITTING_PREFERENCES.map((fit) => (
                    <button
                      key={fit.id}
                      type="button"
                      className={`fittingCard ${fittingPref === fit.id ? "active" : ""}`}
                      onClick={() => setFittingPref(fit.id)}
                    >
                      <b>{fit.label}</b>
                      <span>{fit.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit Toggle */}
              <div className="unitToggleRow">
                <span className="unitLabel">Measuring Tape Unit:</span>
                <div className="unitPillGroup">
                  <button
                    type="button"
                    className={`unitBtn ${unit === "inches" ? "active" : ""}`}
                    onClick={() => setUnit("inches")}
                  >
                    Inches (انچ)
                  </button>
                  <button
                    type="button"
                    className={`unitBtn ${unit === "cm" ? "active" : ""}`}
                    onClick={() => setUnit("cm")}
                  >
                    Centimeters (سنٹی میٹر)
                  </button>
                </div>
              </div>

              {/* Standard Size Selector if picked */}
              {sizePreference === "standard" && (
                <div className="standardSizeBlock">
                  <label className="fieldMainLabel">Select Base Standard Size</label>
                  <div className="standardSizeGrid">
                    {STANDARD_SIZES.map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        className={`standardSizeCard ${standardSize === sz.id ? "selected" : ""}`}
                        onClick={() => setStandardSize(sz.id)}
                      >
                        <b>{sz.id}</b>
                        <span>Chest: {sz.chest}&quot;</span>
                        <span>Waist: {sz.waist}&quot;</span>
                        <span>Hips: {sz.hips}&quot;</span>
                      </button>
                    ))}
                  </div>
                  <div className="sizeCustomNotice">
                    <Info size={16} />
                    <span>Aap standard size select karne ke bawajood neeche shirt length ya koi bhi specific measurement customize kar sakte hain.</span>
                  </div>
                </div>
              )}

              {/* Kameez / Shirt Measurements */}
              <div className="measurementSectionBlock">
                <div className="sectionBlockHead">
                  <div>
                    <h4>Kameez / Shirt Measurements (قمیض کا ناپ)</h4>
                    <p className="blockSub">Enter values in <strong>{unit}</strong>. Leave any field blank if standard.</p>
                  </div>
                  <button type="button" className="btnInlineGuide" onClick={() => setShowGuide(true)}>
                    <HelpCircle size={14} /> Measurement Guide
                  </button>
                </div>

                <div className="measurementsGrid">
                  <div className="measInputBox">
                    <label htmlFor="mShirtLength">
                      Shirt Length <span className="urduLabel">(لمبائی)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mShirtLength"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 42"
                        value={measurements.shirtLength}
                        onChange={(e) => handleMeasurementChange("shirtLength", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Normal: 38–46 in</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mChest">
                      Chest / Bust <span className="urduLabel">(چھاتی)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mChest"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 20"
                        value={measurements.chest}
                        onChange={(e) => handleMeasurementChange("chest", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Across front seam</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mWaist">
                      Waist <span className="urduLabel">(کمر)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mWaist"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 18"
                        value={measurements.waist}
                        onChange={(e) => handleMeasurementChange("waist", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Narrowest point</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mHips">
                      Hip / Daman <span className="urduLabel">(ہپ / دامن)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mHips"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 22"
                        value={measurements.hips}
                        onChange={(e) => handleMeasurementChange("hips", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">At chaak start</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mShoulder">
                      Shoulder / Teera <span className="urduLabel">(تیرا)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mShoulder"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 14.5"
                        value={measurements.shoulder}
                        onChange={(e) => handleMeasurementChange("shoulder", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Bone to bone</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mSleeves">
                      Sleeve Length <span className="urduLabel">(بازو کی لمبائی)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mSleeves"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 21"
                        value={measurements.sleevesLength}
                        onChange={(e) => handleMeasurementChange("sleevesLength", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Shoulder to wrist</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mArmhole">
                      Armhole / Mudha <span className="urduLabel">(موڈھا)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mArmhole"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 8.5"
                        value={measurements.armhole}
                        onChange={(e) => handleMeasurementChange("armhole", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Curved armhole</small>
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mNeck">
                      Front Neck Depth <span className="urduLabel">(اگلا گلا)</span>
                    </label>
                    <div className="measInputWrap">
                      <input
                        id="mNeck"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 6.5"
                        value={measurements.neckDepth}
                        onChange={(e) => handleMeasurementChange("neckDepth", e.target.value)}
                      />
                      <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                    </div>
                    <small className="measHint">Top to slit point</small>
                  </div>
                </div>
              </div>

              {/* Bottom / Trouser Measurements (if not single Kurti) */}
              {dressType !== "Kurti" && (
                <div className="measurementSectionBlock">
                  <div className="sectionBlockHead">
                    <div>
                      <h4>Bottom / Trouser / Shalwar (شلوار یا ٹراؤزر)</h4>
                      <p className="blockSub">Select your trouser cut and enter measurements in <strong>{unit}</strong>.</p>
                    </div>
                  </div>

                  <div className="formFieldGroup" style={{ marginBottom: 18 }}>
                    <label className="fieldMainLabel">Trouser Silhouette Style</label>
                    <div className="chipWrap">
                      {BOTTOM_STYLES.map((style) => (
                        <button
                          key={style}
                          type="button"
                          className={`chipBtn ${bottomStyle === style ? "active" : ""}`}
                          onClick={() => setBottomStyle(style)}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="measurementsGrid">
                    <div className="measInputBox">
                      <label htmlFor="mBottomLength">
                        Bottom Length <span className="urduLabel">(لمبائی)</span>
                      </label>
                      <div className="measInputWrap">
                        <input
                          id="mBottomLength"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 38"
                          value={measurements.bottomLength}
                          onChange={(e) => handleMeasurementChange("bottomLength", e.target.value)}
                        />
                        <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                      </div>
                      <small className="measHint">Waist to ankle</small>
                    </div>

                    <div className="measInputBox">
                      <label htmlFor="mBottomWaist">
                        Bottom Waist / Asan <span className="urduLabel">(کمر / آسن)</span>
                      </label>
                      <div className="measInputWrap">
                        <input
                          id="mBottomWaist"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 15"
                          value={measurements.bottomWaist}
                          onChange={(e) => handleMeasurementChange("bottomWaist", e.target.value)}
                        />
                        <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                      </div>
                      <small className="measHint">Elastic or Belt</small>
                    </div>

                    <div className="measInputBox">
                      <label htmlFor="mThigh">
                        Thigh Width <span className="urduLabel">(ران کی چوڑائی)</span>
                      </label>
                      <div className="measInputWrap">
                        <input
                          id="mThigh"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 13"
                          value={measurements.thigh}
                          onChange={(e) => handleMeasurementChange("thigh", e.target.value)}
                        />
                        <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                      </div>
                      <small className="measHint">Across upper leg</small>
                    </div>

                    <div className="measInputBox">
                      <label htmlFor="mPaincha">
                        Bottom Opening / Paincha <span className="urduLabel">(پانچہ)</span>
                      </label>
                      <div className="measInputWrap">
                        <input
                          id="mPaincha"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 6.5"
                          value={measurements.bottomOpening}
                          onChange={(e) => handleMeasurementChange("bottomOpening", e.target.value)}
                        />
                        <span className="unitAddon">{unit === "inches" ? "in" : "cm"}</span>
                      </div>
                      <small className="measHint">Trouser bottom width</small>
                    </div>
                  </div>
                </div>
              )}

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btnNextStep" onClick={() => setStep(4)}>
                  <span>Next: Review & Contact Details</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review Order Summary & Contact Info */}
          {step === 4 && (
            <div className="formStepSection animateFadeIn">
              <div className="stepHead">
                <span className="stepSuper">STEP 04 / 04</span>
                <h3>Review Order Summary & Contact Details</h3>
                <p>Verify your custom specifications and enter your WhatsApp contact for confirmation and price quote.</p>
              </div>

              {/* Order Recap Luxury Voucher */}
              <div className="orderRecapVoucher">
                <div className="voucherHeader">
                  <div className="voucherLogo">
                    <Sparkles size={16} />
                    <span>BUSTANIYA BESPOKE SPECIFICATIONS</span>
                  </div>
                  <span className="voucherBadge">READY FOR REVIEW</span>
                </div>

                <div className="voucherGrid">
                  <div className="voucherCol">
                    <div className="recapRow">
                      <span className="recapLabel">Selected Outfit:</span>
                      <b className="recapVal highlight">{dressType}</b>
                    </div>
                    <div className="recapRow">
                      <span className="recapLabel">Fabric:</span>
                      <b className="recapVal">{fabricArrangement} ({fabricType})</b>
                    </div>
                    <div className="recapRow">
                      <span className="recapLabel">Color:</span>
                      <b className="recapVal">{colorPreference || "As per reference photo"}</b>
                    </div>
                  </div>

                  <div className="voucherCol">
                    <div className="recapRow">
                      <span className="recapLabel">Sizing Method:</span>
                      <b className="recapVal">
                        {sizePreference === "custom" ? "Custom Body Measurements" : `Standard Size (${standardSize})`}
                      </b>
                    </div>
                    <div className="recapRow">
                      <span className="recapLabel">Neck & Sleeves:</span>
                      <b className="recapVal">{necklineStyle} • {sleeveStyle}</b>
                    </div>
                    <div className="recapRow">
                      <span className="recapLabel">Reference Photos:</span>
                      <b className="recapVal">{referenceImages.length} picture(s) attached</b>
                    </div>
                  </div>
                </div>

                {referenceImages.length > 0 && (
                  <div className="voucherThumbsRow">
                    <span className="voucherThumbsLabel">Attached Inspiration:</span>
                    <div className="voucherThumbsList">
                      {referenceImages.map((src, i) => (
                        <img key={i} src={src} alt="Inspiration preview" className="voucherMiniThumb" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Contact Details */}
              <div className="contactSectionBlock">
                <h4 className="contactSectionTitle">
                  <HeartHandshake size={18} />
                  <span>Where Should We Send Your Price Quote?</span>
                </h4>

                <div className="contactFieldsGrid">
                  <div className="formFieldGroup">
                    <label className="fieldMainLabel" htmlFor="custName">
                      Your Full Name <span className="reqStar">*</span>
                    </label>
                    <input
                      id="custName"
                      type="text"
                      required
                      className="customFormInput"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ayesha Khan"
                    />
                  </div>

                  <div className="formFieldGroup">
                    <label className="fieldMainLabel" htmlFor="custPhone">
                      WhatsApp Phone Number <span className="reqStar">*</span>
                    </label>
                    <div className="phoneInputWrap">
                      <span className="countryPrefix">🇵🇰 +92</span>
                      <input
                        id="custPhone"
                        type="tel"
                        required
                        className="customFormInput phoneInput"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="03xx xxxxxxx"
                      />
                    </div>
                    <small className="fieldHint">
                      Is number par hum price quote aur fabric sample pictures WhatsApp karein gye.
                    </small>
                  </div>

                  <div className="formFieldGroup">
                    <label className="fieldMainLabel" htmlFor="custCity">
                      Delivery City <span className="reqStar">*</span>
                    </label>
                    <input
                      id="custCity"
                      type="text"
                      required
                      className="customFormInput"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="e.g. Lahore, Karachi, Islamabad..."
                    />
                    <div className="cityChipsRow">
                      {POPULAR_CITIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`cityChip ${customerCity === c ? "active" : ""}`}
                          onClick={() => setCustomerCity(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="formFieldGroup">
                    <label className="fieldMainLabel" htmlFor="custEmail">
                      Email Address <small>(optional)</small>
                    </label>
                    <input
                      id="custEmail"
                      type="email"
                      className="customFormInput"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="formFieldGroup fullWidth">
                    <label className="fieldMainLabel" htmlFor="custAddress">
                      Delivery Street Address
                    </label>
                    <textarea
                      id="custAddress"
                      className="customFormTextarea"
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="House / apartment no., street address, sector / area..."
                    />
                  </div>
                </div>
              </div>

              {submitError && <div className="fieldErrorBanner">{submitError}</div>}

              {/* Guarantees & Transparency */}
              <div className="customOrderGuarantees">
                <div className="guaranteeItem">
                  <ShieldCheck size={20} className="gIcon" />
                  <div>
                    <strong>Zero Upfront Commitment</strong>
                    <span>No advance or card details required to submit your quote request.</span>
                  </div>
                </div>
                <div className="guaranteeItem">
                  <MessageSquare size={20} className="gIcon" />
                  <div>
                    <strong>Direct WhatsApp Consultation</strong>
                    <span>Master tailor reviews your design & sends complete pricing in 2–4 hours.</span>
                  </div>
                </div>
                <div className="guaranteeItem">
                  <Truck size={20} className="gIcon" />
                  <div>
                    <strong>Cash on Delivery (COD)</strong>
                    <span>Convenient Cash on Delivery available across all cities in Pakistan.</span>
                  </div>
                </div>
              </div>

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(3)}>
                  <ArrowLeft size={16} /> Back to Size
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btnSubmitCustomOrder"
                >
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Custom Dress Request</span>
                      <CheckCircle2 size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* 4. Measurement Guide Modal */}
      {showGuide && (
        <div className="customGuideModalOverlay" onClick={() => setShowGuide(false)}>
          <div className="customGuideModal" onClick={(e) => e.stopPropagation()}>
            <div className="guideModalHeader">
              <div>
                <span className="guideBadge">ATELIER SIZING MANUAL</span>
                <h3>
                  <Ruler size={20} /> How to Take Body Measurements at Home
                </h3>
              </div>
              <button
                type="button"
                className="btnCloseModal"
                onClick={() => setShowGuide(false)}
                aria-label="Close guide"
              >
                <X size={20} />
              </button>
            </div>
            <div className="guideModalBody">
              <div className="guideTipCallout">
                <Sparkles size={16} />
                <span>
                  <strong>Tip:</strong> Aap measuring tape se apna naap asani se le sakti hain, ya phir kisi achi fitting wali purani qameez aur shalwar ko flat table par bicha kar naap sakti hain!
                </span>
              </div>

              <div className="guideStepList">
                <div className="guideStepCard">
                  <span className="guideStepNum">1</span>
                  <div>
                    <b>Shirt Length (قمیض کی لمبائی)</b>
                    <p>Shoulder (gale ki haddi) se seedha neeche tak jahan tak aap lambai chahti hain (aam tor par 38 se 46 in).</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">2</span>
                  <div>
                    <b>Chest / Bust (چھاتی)</b>
                    <p>Baghloon (underarms) ke 1 inch neeche seedha naap lein (front seam to seam ya poora ghera).</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">3</span>
                  <div>
                    <b>Waist (کمر)</b>
                    <p>Naaf (belly button) ke 1-2 inch upar jahan qameez ki fit curve banti hai.</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">4</span>
                  <div>
                    <b>Hip / Daman (دامن / ہپ)</b>
                    <p>Chaak (slits) shuru hone ki jagah ya daman ki chauraayi (width).</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">5</span>
                  <div>
                    <b>Shoulder / Teera (تیرا)</b>
                    <p>Peechay se ek shoulder joint se doosray shoulder joint tak seedha naap.</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">6</span>
                  <div>
                    <b>Sleeve Length (بازو کی لمبائی)</b>
                    <p>Shoulder joint se kalayi (wrist) tak ya jahan tak bazoo pasand hon.</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">7</span>
                  <div>
                    <b>Bottom Length (شلوار/ٹراؤزر لمبائی)</b>
                    <p>Kamar se ankle (takhnay) tak jahan trouser pehnte hain.</p>
                  </div>
                </div>

                <div className="guideStepCard">
                  <span className="guideStepNum">8</span>
                  <div>
                    <b>Paincha / Opening (پانچہ)</b>
                    <p>Trouser ke neechay ka khula hissa (aam tor par 6 se 7.5 in).</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="guideModalFooter">
              <button type="button" className="btnGotIt" onClick={() => setShowGuide(false)}>
                Got it, Continue Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
