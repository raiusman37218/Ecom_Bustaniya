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
  Info,
  Layers,
  ChevronRight,
} from "lucide-react";

const OUTFIT_TYPES = [
  { id: "Kurti", label: "Kurti / Shirt (قمیض)", desc: "Single top or kurti" },
  { id: "2 Piece", label: "2 Piece Suit (قمیض + شلوار/ٹراؤزر)", desc: "Shirt & Bottom" },
  { id: "3 Piece", label: "3 Piece Suit (قمیض + شلوار + دوپٹہ)", desc: "Complete Suit with Dupatta" },
  { id: "Maxi / Frock", label: "Maxi / Anarkali / Frock", desc: "Long flared gown or frock" },
  { id: "Lehenga", label: "Lehenga / Festive", desc: "Party / festive wear" },
  { id: "Other", label: "Other / Custom Style", desc: "Special cut or design" },
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

const FABRIC_OPTIONS = [
  "Bustaniya will provide fabric (Recommended)",
  "I have my own fabric (Stitching only)",
];

const POPULAR_FABRICS = [
  "Premium Cotton",
  "Summer Lawn",
  "Pure Raw Silk",
  "Chiffon / Georgette",
  "Organza",
  "Banarsi / Jacquard",
  "Velvet",
  "Linen / Khaddar",
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
];

export default function CustomOrderClient({ storeSettings }) {
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState("inches");
  const [sizePreference, setSizePreference] = useState("custom"); // "custom" | "standard"
  const [standardSize, setStandardSize] = useState("M");

  // Dress details
  const [dressType, setDressType] = useState("2 Piece");
  const [fabricArrangement, setFabricArrangement] = useState(FABRIC_OPTIONS[0]);
  const [fabricType, setFabricType] = useState("Premium Cotton");
  const [colorPreference, setColorPreference] = useState("");
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

  // Guide modal
  const [showGuide, setShowGuide] = useState(false);

  const whatsappSupportNumber = storeSettings?.whatsappSupportNumber || "923000000000";

  function handleMeasurementChange(field, value) {
    setMeasurements((prev) => ({ ...prev, [field]: value }));
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
      // Reset input value so same files can be re-selected if needed
      e.target.value = "";
    }
  }

  function handleRemoveImage(index) {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitOrder(e) {
    e.preventDefault();
    if (!customerName.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      setSubmitError("Please enter a valid WhatsApp phone number so we can message you.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
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
        colorPreference,
        designNotes,
        referenceImages,
        measurements: {
          unit,
          bottomStyle,
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

  // WhatsApp quick-chat link after submission
  const whatsappConfirmHref = createdOrder
    ? `https://wa.me/${whatsappSupportNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Assalam-o-Alaikum Bustaniya! 🌸 Maine abhi website par Custom Dress Request submit ki hai (Order No: ${createdOrder.order_number || createdOrder.orderNumber}). Bara-e-meharbani mera design review karein aur price quote provide karein. Shukriya!`
      )}`
    : "#";

  return (
    <div className="customOrderContainer">
      {/* 1. Hero Banner */}
      <section className="customOrderHero">
        <div className="customOrderHeroContent">
          <span className="bespokePill">
            <Sparkles size={14} /> BESPOKE EASTERN TAILORING
          </span>
          <h1>Custom Made-to-Measure Dress</h1>
          <p>
            Apni pasand ka design, perfect custom naap aur premium stitching. Reference pictures aur measurements share karein, hum aapko WhatsApp par rabta kar ke price aur delivery confirm karein gye.
          </p>

          <div className="customOrderPillars">
            <div className="pillarItem">
              <Ruler size={18} />
              <div>
                <b>Perfect Custom Fit</b>
                <span>Tailored to your body measurements</span>
              </div>
            </div>
            <div className="pillarItem">
              <MessageSquare size={18} />
              <div>
                <b>WhatsApp Confirmation</b>
                <span>Price & fabric quote within 2–4 hours</span>
              </div>
            </div>
            <div className="pillarItem">
              <Truck size={18} />
              <div>
                <b>Doorstep Delivery</b>
                <span>Across all cities in Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Success Screen if already submitted */}
      {createdOrder ? (
        <section className="customOrderSuccessCard">
          <div className="successBadgeWrap">
            <CheckCircle2 size={64} className="successIcon" />
          </div>
          <h2>Custom Order Request Received!</h2>
          <p className="orderNumberDisplay">
            Your Order Request No: <strong>{createdOrder.order_number || createdOrder.orderNumber}</strong>
          </p>
          <div className="successDetailsCard">
            <p>
              Thank you, <b>{customerName}</b>! Aapki custom dress request hamare master tailor aur styling consultant ko bhej di gayi hai.
            </p>
            <p>
              Hum aapke shared design aur naap ko review kar ke aglay <b>2–4 ghanton mein aapke WhatsApp ({customerPhone})</b> par rabta karein gye, jahan price quote, fabric confirmation aur delivery timeline share ki jaye gi.
            </p>
          </div>

          <div className="successActions">
            <a
              href={whatsappConfirmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btnWhatsAppDirect"
            >
              <img src="/whatsapp-icon.png" alt="WhatsApp" width={22} height={22} />
              Chat on WhatsApp Now ({createdOrder.order_number || createdOrder.orderNumber})
            </a>
            <a href="/" className="btnBackToStore">
              Continue Shopping
            </a>
          </div>
        </section>
      ) : (
        /* 3. Multi-Step Interactive Form */
        <form className="customOrderFormShell" onSubmit={handleSubmitOrder}>
          {/* Step Navigation Tabs */}
          <div className="customFormStepsNav">
            <button
              type="button"
              className={`stepTabBtn ${step === 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}
              onClick={() => setStep(1)}
            >
              <span className="stepNumber">1</span>
              <span className="stepTitle">Outfit & Fabric</span>
            </button>
            <button
              type="button"
              className={`stepTabBtn ${step === 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}
              onClick={() => setStep(2)}
            >
              <span className="stepNumber">2</span>
              <span className="stepTitle">Reference Photos</span>
            </button>
            <button
              type="button"
              className={`stepTabBtn ${step === 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}
              onClick={() => setStep(3)}
            >
              <span className="stepNumber">3</span>
              <span className="stepTitle">Measurements</span>
            </button>
            <button
              type="button"
              className={`stepTabBtn ${step === 4 ? "active" : ""}`}
              onClick={() => setStep(4)}
            >
              <span className="stepNumber">4</span>
              <span className="stepTitle">Contact & Submit</span>
            </button>
          </div>

          {/* STEP 1: Outfit Type & Fabric */}
          {step === 1 && (
            <div className="formStepSection">
              <div className="stepHead">
                <h3>Step 1: Choose Outfit Style & Fabric</h3>
                <p>Select what kind of dress you want Bustaniya to tailor for you.</p>
              </div>

              {/* Outfit Types */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">What would you like to make? *</label>
                <div className="outfitTypeGrid">
                  {OUTFIT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={`outfitChoiceCard ${dressType === type.id ? "selected" : ""}`}
                      onClick={() => setDressType(type.id)}
                    >
                      <Scissors size={20} />
                      <b>{type.label}</b>
                      <span>{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fabric Source */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">Fabric Arrangement *</label>
                <div className="radioChoiceRow">
                  {FABRIC_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className={`radioChoiceLabel ${fabricArrangement === opt ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="fabricArrangement"
                        value={opt}
                        checked={fabricArrangement === opt}
                        onChange={() => setFabricArrangement(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Fabric Type */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">Preferred Fabric Type</label>
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

              {/* Preferred Color */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel" htmlFor="colorPreference">
                  Desired Color / Shade
                </label>
                <input
                  id="colorPreference"
                  type="text"
                  className="customFormInput"
                  value={colorPreference}
                  onChange={(e) => setColorPreference(e.target.value)}
                  placeholder="e.g. Powder Blue, Emerald Green, Off-White, Lilac..."
                />
              </div>

              <div className="stepNavButtons">
                <span />
                <button type="button" className="btnNextStep" onClick={() => setStep(2)}>
                  Next: Reference Photos <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Reference Photos & Design Styling */}
          {step === 2 && (
            <div className="formStepSection">
              <div className="stepHead">
                <h3>Step 2: Reference Photos & Design Details</h3>
                <p>
                  Share screenshots or design photos from Instagram, Pinterest, or your gallery (Front, Back, Neckline, Sleeves).
                </p>
              </div>

              {/* Photo Upload Area */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel">Upload Reference Photos (Up to 6 photos)</label>
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
                    <UploadCloud size={38} />
                    <b>Click to upload inspiration pictures</b>
                    <span>PNG, JPG, or WEBP (up to 10MB each)</span>
                  </label>
                </div>

                {uploading && (
                  <div className="uploadingIndicator">
                    <span className="spinner" /> Uploading photos, please wait...
                  </div>
                )}
                {uploadError && <p className="fieldErrorText">{uploadError}</p>}

                {/* Previews */}
                {referenceImages.length > 0 && (
                  <div className="uploadedPhotosGrid">
                    {referenceImages.map((url, idx) => (
                      <div className="uploadedPhotoThumb" key={idx}>
                        <img src={url} alt={`Reference ${idx + 1}`} />
                        <button
                          type="button"
                          className="btnRemoveThumb"
                          onClick={() => handleRemoveImage(idx)}
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Design Notes */}
              <div className="formFieldGroup">
                <label className="fieldMainLabel" htmlFor="designNotes">
                  Specific Styling & Stitching Instructions
                </label>
                <textarea
                  id="designNotes"
                  className="customFormTextarea"
                  rows={4}
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                  placeholder="e.g. Need boat neckline with delicate laces, slit sleeves with organza borders, straight hemline, lightweight lining attached inside..."
                />
                <small className="fieldHint">
                  Har tarah ki detail likhein jaise neckline, laces, buttons, sleeves style waghera.
                </small>
              </div>

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="btnNextStep" onClick={() => setStep(3)}>
                  Next: Measurements <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Detailed Measurements */}
          {step === 3 && (
            <div className="formStepSection">
              <div className="stepHeadWithAction">
                <div>
                  <h3>Step 3: Size & Measurements</h3>
                  <p>Choose your size preference and provide accurate measurements.</p>
                </div>
                <button
                  type="button"
                  className="btnOpenGuide"
                  onClick={() => setShowGuide(true)}
                >
                  <HelpCircle size={16} /> How to measure guide
                </button>
              </div>

              {/* Size Mode Selector */}
              <div className="sizeModeToggleRow">
                <button
                  type="button"
                  className={`sizeModeBtn ${sizePreference === "custom" ? "active" : ""}`}
                  onClick={() => setSizePreference("custom")}
                >
                  <Ruler size={18} />
                  <div>
                    <b>Custom Measurements</b>
                    <span>Best tailored fit for your unique body</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`sizeModeBtn ${sizePreference === "standard" ? "active" : ""}`}
                  onClick={() => setSizePreference("standard")}
                >
                  <Layers size={18} />
                  <div>
                    <b>Standard Size (S, M, L, XL)</b>
                    <span>Pick standard size + minor adjustments</span>
                  </div>
                </button>
              </div>

              {/* Unit Toggle */}
              <div className="unitToggleRow">
                <span>Measurement Unit:</span>
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

              {/* Standard Size selector if picked */}
              {sizePreference === "standard" && (
                <div className="standardSizeBlock">
                  <label className="fieldMainLabel">Choose Standard Base Size</label>
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
                  <p className="sizeCustomNotice">
                    <Info size={16} /> Standard size select karne ke bawajood aap neeche di gayi fields mein shirt length ya koi bhi specific measurement customize kar sakte hain.
                  </p>
                </div>
              )}

              {/* Kameez / Shirt Measurements */}
              <div className="measurementSectionBlock">
                <div className="sectionBlockHead">
                  <h4>Kameez / Shirt Measurements (قمیض کا ناپ)</h4>
                  <small>All values in {unit}</small>
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
                  </div>

                  <div className="measInputBox">
                    <label htmlFor="mHips">
                      Hip / Daman <span className="urduLabel">(دامن / ہپ)</span>
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
                  </div>
                </div>
              </div>

              {/* Bottom / Trouser Measurements (if not single Kurti) */}
              {dressType !== "Kurti" && (
                <div className="measurementSectionBlock">
                  <div className="sectionBlockHead">
                    <h4>Bottom / Trouser / Shalwar Measurements (شلوار / ٹراؤزر)</h4>
                    <small>All values in {unit}</small>
                  </div>

                  <div className="formFieldGroup" style={{ marginBottom: 18 }}>
                    <label className="fieldMainLabel">Bottom Style (شلوار یا ٹراؤزر کی قسم)</label>
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
                    </div>

                    <div className="measInputBox">
                      <label htmlFor="mThigh">
                        Thigh <span className="urduLabel">(ران)</span>
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
                    </div>
                  </div>
                </div>
              )}

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="btnNextStep" onClick={() => setStep(4)}>
                  Next: Contact Details <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Contact Info & Final Submission */}
          {step === 4 && (
            <div className="formStepSection">
              <div className="stepHead">
                <h3>Step 4: Contact Details & Order Confirmation</h3>
                <p>Provide your contact information so we can WhatsApp your quote and confirm details.</p>
              </div>

              {/* Order Summary Recap */}
              <div className="orderRecapBox">
                <h4>Order Summary</h4>
                <div className="recapRow">
                  <span>Outfit Type:</span>
                  <b>{dressType}</b>
                </div>
                <div className="recapRow">
                  <span>Fabric:</span>
                  <b>{fabricArrangement} ({fabricType})</b>
                </div>
                {colorPreference && (
                  <div className="recapRow">
                    <span>Color:</span>
                    <b>{colorPreference}</b>
                  </div>
                )}
                <div className="recapRow">
                  <span>Size Mode:</span>
                  <b>{sizePreference === "custom" ? "Custom Tailored Measurements" : `Standard ${standardSize}`}</b>
                </div>
                <div className="recapRow">
                  <span>Reference Photos:</span>
                  <b>{referenceImages.length} photo(s) attached</b>
                </div>
              </div>

              {/* Contact Inputs */}
              <div className="contactFieldsGrid">
                <div className="formFieldGroup">
                  <label className="fieldMainLabel" htmlFor="custName">
                    Your Full Name *
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
                    WhatsApp Phone Number *
                  </label>
                  <input
                    id="custPhone"
                    type="tel"
                    required
                    className="customFormInput"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03xx xxxxxxx"
                  />
                  <small className="fieldHint">Is number par hum price quote aur design confirmation ka message bhein gye.</small>
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
                    placeholder="you@example.com"
                  />
                </div>

                <div className="formFieldGroup">
                  <label className="fieldMainLabel" htmlFor="custCity">
                    City *
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
                  <div className="chipWrap" style={{ marginTop: 8 }}>
                    {POPULAR_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`chipBtn small ${customerCity === c ? "active" : ""}`}
                        onClick={() => setCustomerCity(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="formFieldGroup fullWidth">
                  <label className="fieldMainLabel" htmlFor="custAddress">
                    Delivery Address
                  </label>
                  <textarea
                    id="custAddress"
                    className="customFormTextarea"
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="House/flat no., street, block/area..."
                  />
                </div>
              </div>

              {submitError && <div className="fieldErrorBanner">{submitError}</div>}

              {/* Guarantees */}
              <div className="customOrderGuarantees">
                <div className="guaranteeItem">
                  <ShieldCheck size={20} />
                  <span>No upfront payment required to submit quote request.</span>
                </div>
                <div className="guaranteeItem">
                  <MessageSquare size={20} />
                  <span>Manual WhatsApp confirmation with custom pricing & fabric samples.</span>
                </div>
              </div>

              <div className="stepNavButtons">
                <button type="button" className="btnPrevStep" onClick={() => setStep(3)}>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btnSubmitCustomOrder"
                >
                  {submitting ? (
                    <>
                      <span className="spinner" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Custom Dress Request <CheckCircle2 size={18} />
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
              <h3>
                <Ruler size={20} /> How to Take Measurements at Home
              </h3>
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
              <p className="guideIntro">
                Aap ghar mein measuring tape se apna naap asani se le sakte hain ya kisi achi fitting wali purani qameez/shalwar ko table par seedha bicha kar naap sakte hain:
              </p>

              <div className="guideStepList">
                <div className="guideStepCard">
                  <b>1. Shirt Length (قمیض لمبائی)</b>
                  <p>Shoulder (gale ki haddi) se neeche tak jahan tak aap qameez ki lambai chahti hain.</p>
                </div>
                <div className="guideStepCard">
                  <b>2. Chest / Bust (چھاتی)</b>
                  <p>Baghloon (underarms) ke 1 inch neeche seedha naap lein (front ya full round).</p>
                </div>
                <div className="guideStepCard">
                  <b>3. Waist (کمر)</b>
                  <p>Naaf (belly button) ke 1-2 inch upar jahan qameez ki curve aati hai.</p>
                </div>
                <div className="guideStepCard">
                  <b>4. Hip / Daman (ہپ / دامن)</b>
                  <p>Chaak (slits) ke shuru hone ki jagah ya daman ki chauraayi (width).</p>
                </div>
                <div className="guideStepCard">
                  <b>5. Sleeves (بازو)</b>
                  <p>Shoulder joint se wrist (kalayi) tak.</p>
                </div>
                <div className="guideStepCard">
                  <b>6. Bottom Length (شلوار/ٹراؤزر لمبائی)</b>
                  <p>Kamar se ankle (takhnay) tak.</p>
                </div>
              </div>
            </div>
            <div className="guideModalFooter">
              <button type="button" className="btnGotIt" onClick={() => setShowGuide(false)}>
                Got it, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
