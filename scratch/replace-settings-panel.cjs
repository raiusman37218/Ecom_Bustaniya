const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../components/AdminDashboard.js");
let content = fs.readFileSync(filePath, "utf8");

// Find start of SettingsPanel
const startMarker = "function SettingsPanel({ onOpen, signedInUser, initialTab = \"\" }) {";
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Could not find startMarker");
  process.exit(1);
}

// Find end of SettingsPanel (before settingsTabHint)
const endMarker = "function settingsTabHint(tab) {";
const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error("Could not find endMarker");
  process.exit(1);
}

const newSettingsPanelCode = `function SettingsPanel({ onOpen, signedInUser, initialTab = "" }) {
  const [activeTab, setActiveTab] = useState(initialTab || "Store");
  const [savedAt, setSavedAt] = useState("");
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);
  const [storeSettingsError, setStoreSettingsError] = useState("");
  const [storeSettingsSetup, setStoreSettingsSetup] = useState("");
  const [heroUrlInputs, setHeroUrlInputs] = useState({});
  const [staff, setStaff] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSaved, setStaffSaved] = useState("");
  const [capiTesting, setCapiTesting] = useState(false);
  const [capiTestResult, setCapiTestResult] = useState(null);
  const [shippingZones, setShippingZones] = useState([
    { zone: "Pakistan - Standard", cities: "All PostEx service cities", rate: "Rs. 200 COD", freeAbove: "Rs. 5,000" },
    { zone: "Lahore same-day", cities: "Lahore", rate: "Rs. 250", freeAbove: "Rs. 8,000" },
  ]);

  async function testCapiConnection() {
    setCapiTesting(true);
    setCapiTestResult(null);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_event", eventName: "PageView" }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.error || result.result?.error || "Meta API responded with error.");
      }
      setCapiTestResult({
        success: true,
        message: \`✅ Test PageView event sent successfully to Meta CAPI! (Events received: \${result.result?.result?.events_received ?? 1}, fbtrace_id: \${result.result?.result?.fbtrace_id || "OK"})\`,
      });
    } catch (err) {
      setCapiTestResult({
        success: false,
        message: \`❌ CAPI test failed: \${err.message}\`,
      });
    } finally {
      setCapiTesting(false);
    }
  }

  const canManageUsers = canUseAdminArea(signedInUser, "users");

  const settingNavGroups = [
    {
      group: "Storefront & Design",
      items: [
        { id: "Store", label: "Store Details", icon: "🏪", hint: "Brand & Banners" },
        { id: "Sections", label: "Homepage Sections", icon: "🎨", hint: "Page Builder" },
        { id: "SizeChart", label: "Size Guide Matrix", icon: "📏", hint: "Measurements" },
      ],
    },
    {
      group: "Checkout & Operations",
      items: [
        { id: "Payments", label: "Payments & COD", icon: "💳", hint: "COD, Bank, Rules" },
        { id: "Shipping", label: "Shipping & Rates", icon: "🚚", hint: "Timeline & Zones" },
        { id: "Checkout", label: "Checkout Flow", icon: "🛒", hint: "Guest & Fields" },
      ],
    },
    {
      group: "Marketing & Growth",
      items: [
        { id: "Tracking", label: "Meta Pixel & CAPI", icon: "🎯", hint: "Pixel & Events" },
        { id: "Notifications", label: "Notifications", icon: "🔔", hint: "Email Templates" },
        { id: "Domains", label: "Domains & SEO", icon: "🌐", hint: "URLs & Meta" },
      ],
    },
    {
      group: "Administration",
      items: [
        ...(canManageUsers ? [{ id: "Users", label: "Staff & Users", icon: "👥", hint: "Admin Access" }] : []),
        { id: "System", label: "System Health", icon: "⚙️", hint: "Database Audit" },
      ],
    },
  ];

  useEffect(() => {
    if (["Store", "Sections", "Tracking", "SizeChart", "Payments", "Shipping", "Notifications", "Domains", "Checkout"].includes(activeTab)) {
      loadStoreSettings();
    }
    if (activeTab === "Users") loadAdminUsers();
  }, [activeTab]);

  async function addHeroImageUrl(field) {
    const url = String(heroUrlInputs[field] || "").trim();
    if (!url) return;
    if (!url.startsWith("/") && !/^https?:\\/\\//i.test(url)) {
      setStoreSettingsError("Paste a valid image URL (https://...) or local image path (e.g. /hero-image.jpg).");
      return;
    }
    setStoreSettingsError("");
    setStoreSettings((current) => {
      const defaultImg = field === "heroDesktopImages" ? DEFAULT_STORE_SETTINGS.heroDesktopImage : DEFAULT_STORE_SETTINGS.heroMobileImage;
      const legacyField = field === "heroDesktopImages" ? "heroDesktopImage" : "heroMobileImage";
      const raw = current[field] !== undefined ? current[field] : (current[legacyField] ? [current[legacyField]] : []);
      const currentList = Array.isArray(raw) ? raw : [raw].filter(Boolean);
      const isOnlyDefault = currentList.length === 1 && (
        currentList[0] === DEFAULT_STORE_SETTINGS.heroDesktopImage ||
        currentList[0] === DEFAULT_STORE_SETTINGS.heroMobileImage ||
        currentList[0] === "/bustaniya-campaign-hero-v5.png" ||
        currentList[0] === "/bustaniya-campaign-hero-mobile-v1.png"
      );
      const nextImages = isOnlyDefault ? [url] : [...currentList, url];
      return {
        ...current,
        [field]: nextImages,
        [legacyField]: nextImages[0] || "",
      };
    });
    setHeroUrlInputs((current) => ({ ...current, [field]: "" }));
  }

  function removeHeroSlide(field, idx) {
    setStoreSettings((current) => {
      const legacyField = field === "heroDesktopImages" ? "heroDesktopImage" : "heroMobileImage";
      const raw = current[field] !== undefined ? current[field] : (current[legacyField] ? [current[legacyField]] : []);
      const currentList = Array.isArray(raw) ? raw : [raw].filter(Boolean);
      const nextImages = currentList.filter((_, i) => i !== idx);
      return {
        ...current,
        [field]: nextImages,
        [legacyField]: nextImages[0] || "",
      };
    });
  }

  function moveHeroSlide(field, fromIdx, toIdx) {
    setStoreSettings((current) => {
      const legacyField = field === "heroDesktopImages" ? "heroDesktopImage" : "heroMobileImage";
      const raw = current[field] !== undefined ? current[field] : (current[legacyField] ? [current[legacyField]] : []);
      const list = [...(Array.isArray(raw) ? raw : [raw].filter(Boolean))];
      if (toIdx < 0 || toIdx >= list.length) return current;
      const [item] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, item);
      return {
        ...current,
        [field]: list,
        [legacyField]: list[0] || "",
      };
    });
  }

  function clearHeroSlides(field) {
    setStoreSettings((current) => {
      const legacyField = field === "heroDesktopImages" ? "heroDesktopImage" : "heroMobileImage";
      return {
        ...current,
        [field]: [],
        [legacyField]: "",
      };
    });
  }

  function updateHeroContent(device, changes) {
    const key = device === "mobile" ? "heroMobileContent" : "heroDesktopContent";
    setStoreSettings((current) => {
      const fallback = device === "mobile"
        ? { ...(current.heroMobileContent || current.heroDesktopContent || {}), position: "bottom" }
        : (current.heroDesktopContent || {
          eyebrow: current.heroEyebrow || "",
          heading: current.heroHeading || "",
          supportingText: current.heroSupportingText || "",
          primaryButtonText: current.heroPrimaryButtonText || "",
          primaryButtonLink: current.heroPrimaryButtonLink || "#products",
          secondaryButtonText: current.heroSecondaryButtonText || "",
          secondaryButtonLink: current.heroSecondaryButtonLink || "",
          alignment: current.heroTextAlignment || "left",
          position: current.heroTextPosition || "left",
        });
      return { ...current, [key]: { ...fallback, ...changes } };
    });
  }

  async function loadStoreSettings() {
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load store settings.");
      const nextSettings = result.settings || DEFAULT_STORE_SETTINGS;
      setStoreSettings(nextSettings);
      setShippingZones(nextSettings.shippingZones || DEFAULT_STORE_SETTINGS.shippingZones);
      setStoreSettingsSetup(result.needsSetup ? \`Run \${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.\` : "");
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  async function loadAdminUsers() {
    setStaffLoading(true);
    setStaffError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load admin users.");
      setStaff(result.users || []);
      setAvailablePermissions(result.permissions || []);
      setCurrentAdminUser(result.currentUser || null);
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  async function saveStoreSettings(event) {
    if (event?.preventDefault) event.preventDefault();
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    setStoreSettingsSetup("");
    setSavedAt("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: storeSettings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save store settings.");
      setStoreSettings(result.settings || storeSettings);
      if (result.needsSetup) {
        setStoreSettingsSetup(\`Run \${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.\`);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" }));
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  function saveSettings(event) {
    return saveStoreSettings(event);
  }

  function updateSettingsGroup(group, changes) {
    setStoreSettings((current) => ({ ...current, [group]: { ...(DEFAULT_STORE_SETTINGS[group] || {}), ...(current[group] || {}), ...changes } }));
  }

  function updateAnnouncement(index, changes) {
    setStoreSettings((current) => ({
      ...current,
      announcements: (current.announcements || []).map((announcement, itemIndex) =>
        itemIndex === index ? { ...announcement, ...changes } : announcement
      ),
    }));
  }

  function addAnnouncement() {
    setStoreSettings((current) => ({
      ...current,
      announcements: [
        ...(current.announcements || []),
        {
          id: \`announcement-\${Date.now()}\`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        },
      ],
    }));
  }

  function removeAnnouncement(index) {
    setStoreSettings((current) => {
      const nextAnnouncements = (current.announcements || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        announcements: nextAnnouncements.length ? nextAnnouncements : [{
          id: \`announcement-\${Date.now()}\`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        }],
      };
    });
  }

  function updatePaymentSettings(changes) {
    setStoreSettings((current) => ({
      ...current,
      paymentSettings: {
        ...DEFAULT_STORE_SETTINGS.paymentSettings,
        ...(current.paymentSettings || {}),
        ...changes,
      },
    }));
  }

  function addStaff(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const permissions = availablePermissions.filter((permission) => form.get(\`permission-\${permission}\`));
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        permissions,
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to create admin user.");
        formElement.reset();
        setStaffSaved("Admin user added.");
        await loadAdminUsers();
      })
      .catch((error) => setStaffError(error.message))
      .finally(() => setStaffLoading(false));
  }

  async function updateStaffUser(userId, changes) {
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update admin user.");
      setStaffSaved("Admin access updated.");
      await loadAdminUsers();
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  async function deleteStaffUser(userId) {
    const user = staff.find((u) => u.id === userId);
    requestConfirm({
      title: "Remove Admin User",
      message: \`Are you sure you want to remove admin user "\${user?.name || "this user"}"? They will lose access to the admin portal.\`,
      confirmText: "Remove User",
      isDanger: true,
      onConfirm: async () => {
        setStaffError("");
        setStaffSaved("");
        setStaffLoading(true);
        try {
          const response = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to remove admin user.");
          setStaffSaved("Admin user removed.");
          await loadAdminUsers();
        } catch (error) {
          setStaffError(error.message);
        } finally {
          setStaffLoading(false);
        }
      },
    });
  }

  function addShippingZone(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextZone = {
      id: \`shipping-zone-\${Date.now()}\`,
      zone: String(form.get("zone") || "New zone"),
      cities: String(form.get("cities") || "Selected cities"),
      rate: Math.max(0, Number(form.get("rate") || 0)),
      freeAbove: Math.max(0, Number(form.get("freeAbove") || 0)),
    };
    setShippingZones((current) => [...current, nextZone]);
    setStoreSettings((current) => ({ ...current, shippingZones: [...(current.shippingZones || []), nextZone] }));
    event.currentTarget.reset();
  }

  function removeShippingZone(index) {
    const updated = (shippingZones || []).filter((_, idx) => idx !== index);
    setShippingZones(updated);
    setStoreSettings((current) => ({ ...current, shippingZones: updated }));
  }

  function updateDeliverySettings(changes) {
    setStoreSettings((current) => ({
      ...current,
      deliverySettings: {
        ...(DEFAULT_STORE_SETTINGS.deliverySettings || {}),
        ...(current.deliverySettings || {}),
        ...changes,
      },
    }));
  }

  return (
    <div className="shopifySettingsWorkspace">
      {/* Top Header */}
      <div className="shopifySettingsHeader">
        <div className="shopifySettingsHeaderLeft">
          <h1><span>⚙️</span> Settings</h1>
          <p>Manage your storefront preferences, checkout rules, payment methods, delivery rates, and tracking pixels.</p>
        </div>
        <div className="shopifySettingsHeaderRight">
          {savedAt && (
            <span className="shopifySavedPill">
              <span>✅</span> Saved at {savedAt}
            </span>
          )}
          {activeTab !== "System" && activeTab !== "Users" && (
            <button
              type="button"
              className="shopifyBtnPrimary"
              onClick={(e) => saveStoreSettings(e)}
              disabled={storeSettingsLoading}
            >
              {storeSettingsLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "💾 Save Settings"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error / Setup Alerts */}
      {storeSettingsError && (
        <div className="adminErrorBanner" style={{ marginBottom: "16px" }}>
          ⚠️ {storeSettingsError}
        </div>
      )}
      {storeSettingsSetup && (
        <div className="adminErrorBanner" style={{ marginBottom: "16px" }}>
          ℹ️ {storeSettingsSetup}
        </div>
      )}

      {/* Main 2-Column Settings Layout */}
      <div className="shopifySettingsLayout">
        {/* Left Navigation */}
        <aside className="shopifySettingsNav">
          {settingNavGroups.map((group) => (
            <div key={group.group} style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "8px" }}>
              <span className="shopifyNavGroupTitle">{group.group}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={\`shopifyNavItem \${activeTab === item.id ? "active" : ""}\`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="shopifyNavItemLeft">
                    <span className="shopifyNavItemIcon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className="shopifyNavItemHint">{item.hint}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Right Settings Content */}
        <div className="shopifySettingsContent">
          {/* 1. STORE DETAILS */}
          {activeTab === "Store" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Product Card Design */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Storefront Design Preferences</h3>
                    <p>Customize the visual layout of product tiles and category collections across the store.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <label className="shopifyFieldLabel">
                    Product Card Layout
                    <div className="shopifyVisualChoiceGrid" style={{ marginTop: "6px" }}>
                      <div
                        className={\`shopifyVisualChoiceCard \${(storeSettings.productCardStyle || "connected") === "connected" ? "selected" : ""}\`}
                        onClick={() => setStoreSettings((current) => ({ ...current, productCardStyle: "connected" }))}
                      >
                        <div className="shopifyVisualChoiceHead">
                          <b>Connected Tiles (Sapphire Style)</b>
                          {(storeSettings.productCardStyle || "connected") === "connected" && (
                            <span className="shopifyVisualChoiceCheck">✓</span>
                          )}
                        </div>
                        <p>Modern seamless grid with edge-to-edge product tiles and clean typography.</p>
                      </div>
                      <div
                        className={\`shopifyVisualChoiceCard \${storeSettings.productCardStyle === "classic" ? "selected" : ""}\`}
                        onClick={() => setStoreSettings((current) => ({ ...current, productCardStyle: "classic" }))}
                      >
                        <div className="shopifyVisualChoiceHead">
                          <b>Classic Cards</b>
                          {storeSettings.productCardStyle === "classic" && (
                            <span className="shopifyVisualChoiceCheck">✓</span>
                          )}
                        </div>
                        <p>Traditional bordered ecommerce cards with individual white card containers.</p>
                      </div>
                    </div>
                  </label>

                  <label className="shopifyFieldLabel" style={{ marginTop: "10px" }}>
                    Shop by Category Layout
                    <div className="shopifyVisualChoiceGrid" style={{ marginTop: "6px" }}>
                      <div
                        className={\`shopifyVisualChoiceCard \${(storeSettings.categorySectionStyle || "atelier") === "atelier" ? "selected" : ""}\`}
                        onClick={() => {
                          const nextStyle = "atelier";
                          setStoreSettings((current) => {
                            const sections = (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((sec) =>
                              sec.type === "shop_by_category" ? { ...sec, style: nextStyle } : sec
                            );
                            return { ...current, categorySectionStyle: nextStyle, homepageSections: sections };
                          });
                        }}
                      >
                        <div className="shopifyVisualChoiceHead">
                          <b>Atelier Overlay Cards</b>
                          {(storeSettings.categorySectionStyle || "atelier") === "atelier" && (
                            <span className="shopifyVisualChoiceCheck">✓</span>
                          )}
                        </div>
                        <p>Dark luxury overlay with elegant text typography over category imagery.</p>
                      </div>
                      <div
                        className={\`shopifyVisualChoiceCard \${storeSettings.categorySectionStyle === "minimal" ? "selected" : ""}\`}
                        onClick={() => {
                          const nextStyle = "minimal";
                          setStoreSettings((current) => {
                            const sections = (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((sec) =>
                              sec.type === "shop_by_category" ? { ...sec, style: nextStyle } : sec
                            );
                            return { ...current, categorySectionStyle: nextStyle, homepageSections: sections };
                          });
                        }}
                      >
                        <div className="shopifyVisualChoiceHead">
                          <b>Minimal Collections Grid (House of Lucknawi)</b>
                          {storeSettings.categorySectionStyle === "minimal" && (
                            <span className="shopifyVisualChoiceCheck">✓</span>
                          )}
                        </div>
                        <p>Soft rounded cards with category titles positioned below the photo.</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Announcement Bar */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Header Announcement Bar</h3>
                    <p>Rotating promotional bar above the top header.</p>
                  </div>
                  <button
                    type="button"
                    className="shopifyBtnSecondary"
                    onClick={addAnnouncement}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    + Add Announcement
                  </button>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Announcement Bar Enabled</b>
                      <span>Show announcements banner at the very top of all pages.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.announcementEnabled !== false}
                        onChange={(e) => setStoreSettings((current) => ({ ...current, announcementEnabled: e.target.checked }))}
                      /> Enabled
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(storeSettings.announcements || []).map((announcement, index) => (
                      <div
                        key={announcement.id || index}
                        style={{
                          padding: "14px",
                          border: "1px solid #e2e8e5",
                          borderRadius: "10px",
                          background: "#fafcfa",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12.5px", fontWeight: 750, color: "#122a1e" }}>
                            Announcement #{index + 1}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <label className="switchLabel" style={{ fontSize: "12px" }}>
                              <input
                                type="checkbox"
                                checked={announcement.enabled !== false}
                                onChange={(e) => updateAnnouncement(index, { enabled: e.target.checked })}
                              /> Active
                            </label>
                            <button
                              type="button"
                              onClick={() => removeAnnouncement(index)}
                              style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
                              title="Delete announcement"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>
                        <input
                          className="shopifyInput"
                          value={announcement.text || ""}
                          onChange={(e) => updateAnnouncement(index, { text: e.target.value })}
                          placeholder="e.g. Free Delivery Nationwide on orders above Rs. 5,000"
                        />
                        <div className="shopifyFormRow">
                          <input
                            className="shopifyInput"
                            value={announcement.linkLabel || ""}
                            onChange={(e) => updateAnnouncement(index, { linkLabel: e.target.value })}
                            placeholder="Link text (e.g. Shop Now)"
                          />
                          <input
                            className="shopifyInput"
                            value={announcement.linkHref || ""}
                            onChange={(e) => updateAnnouncement(index, { linkHref: e.target.value })}
                            placeholder="Link destination (e.g. /category/kurtis)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Social Media & Instagram Gallery</h3>
                    <p>Connect your brand Instagram & TikTok accounts.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Instagram Feed Gallery on Homepage</b>
                      <span>Display the 6-column Instagram Reels feed on the homepage.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.instagramEnabled !== false}
                        onChange={(e) => setStoreSettings((current) => ({ ...current, instagramEnabled: e.target.checked }))}
                      /> Enabled
                    </label>
                  </div>

                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Instagram Handle
                      <input
                        className="shopifyInput"
                        value={storeSettings.instagramHandle || "@bustaniya_"}
                        onChange={(e) => setStoreSettings((current) => ({ ...current, instagramHandle: e.target.value }))}
                        placeholder="@bustaniya_"
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      TikTok Handle
                      <input
                        className="shopifyInput"
                        value={storeSettings.tiktokHandle || "@bustaniya_"}
                        onChange={(e) => setStoreSettings((current) => ({ ...current, tiktokHandle: e.target.value }))}
                        placeholder="@bustaniya_"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Hero Carousel & Banners */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Hero Carousel & Campaign Banners</h3>
                    <p>Manage desktop and mobile hero campaign banners, headlines and call-to-actions.</p>
                  </div>
                  <label className="switchLabel">
                    <input
                      type="checkbox"
                      checked={storeSettings.heroEnabled !== false}
                      onChange={(e) => setStoreSettings((current) => ({ ...current, heroEnabled: e.target.checked }))}
                    /> Enabled
                  </label>
                </div>
                <div className="shopifySectionBody">
                  {/* Desktop & Mobile Slides Managers */}
                  {[
                    { field: "heroDesktopImages", legacyField: "heroDesktopImage", label: "Desktop Hero Slides", hint: "Wide campaign images (recommended 1920x800)" },
                    { field: "heroMobileImages", legacyField: "heroMobileImage", label: "Mobile Hero Slides", hint: "Portrait campaign images (recommended 1080x1350 / 4:5)" },
                  ].map((item) => {
                    const defaultImg = item.field === "heroDesktopImages" ? DEFAULT_STORE_SETTINGS.heroDesktopImage : DEFAULT_STORE_SETTINGS.heroMobileImage;
                    const raw = storeSettings[item.field] !== undefined ? storeSettings[item.field] : (storeSettings[item.legacyField] ? [storeSettings[item.legacyField]] : [defaultImg]);
                    const list = Array.isArray(raw) ? raw : [raw].filter(Boolean);

                    return (
                      <div key={item.field} style={{ border: "1px solid #e2e8e5", borderRadius: "10px", padding: "16px", background: "#fdfefe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <div>
                            <span style={{ fontSize: "14px", fontWeight: 750, color: "#122a1e" }}>{item.label}</span>
                            <span style={{ fontSize: "11.5px", color: "#667a6e", marginLeft: "8px" }}>{item.hint}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {list.length > 0 && (
                              <button
                                type="button"
                                onClick={() => clearHeroSlides(item.field)}
                                style={{ background: "none", border: "none", color: "#b91c1c", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                              >
                                Clear all
                              </button>
                            )}
                            <span style={{ fontSize: "11px", color: "#8c9c91", fontWeight: 600 }}>{list.length} slide{list.length === 1 ? "" : "s"}</span>
                          </div>
                        </div>

                        {/* Grid of slides */}
                        {list.length === 0 ? (
                          <div style={{ padding: "16px", textAlign: "center", background: "#f8faf7", border: "1px dashed #d5ded3", borderRadius: "8px", color: "#5d6d61", fontSize: "12px", margin: "10px 0" }}>
                            No slides configured. Add an image URL below or click{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setStoreSettings((current) => ({
                                  ...current,
                                  [item.field]: [defaultImg],
                                  [item.legacyField]: defaultImg,
                                }));
                              }}
                              style={{ background: "none", border: "none", color: "#173d29", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
                            >
                              Restore default banner
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                            {list.map((url, idx) => (
                              <div key={\`\${url}-\${idx}\`} style={{ border: "1px solid #d4ded6", borderRadius: "8px", overflow: "hidden", position: "relative", background: "#f8faf7" }}>
                                <div style={{ height: "100px", width: "100%", position: "relative" }}>
                                  <img src={url} alt={\`\${item.label} \${idx + 1}\`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  <div style={{ position: "absolute", top: "4px", right: "4px", display: "flex", gap: "3px" }}>
                                    {idx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => moveHeroSlide(item.field, idx, idx - 1)}
                                        title="Move left"
                                        style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#ffffff", border: "1px solid #ccc", display: "grid", placeItems: "center", cursor: "pointer" }}
                                      >
                                        <ChevronLeft size={11} />
                                      </button>
                                    )}
                                    {idx < list.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => moveHeroSlide(item.field, idx, idx + 1)}
                                        title="Move right"
                                        style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#ffffff", border: "1px solid #ccc", display: "grid", placeItems: "center", cursor: "pointer" }}
                                      >
                                        <ChevronRight size={11} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removeHeroSlide(item.field, idx)}
                                      title="Remove"
                                      style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#fee2e2", border: "1px solid #fca5a5", display: "grid", placeItems: "center", cursor: "pointer", color: "#991b1b" }}
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                </div>
                                <div style={{ padding: "6px 8px", fontSize: "10.5px", color: "#667a6e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={url}>
                                  {url}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add slide row */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input
                            className="shopifyInput"
                            value={heroUrlInputs[item.field] || ""}
                            onChange={(e) => setHeroUrlInputs((current) => ({ ...current, [item.field]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addHeroImageUrl(item.field);
                              }
                            }}
                            placeholder="Paste image URL (https://...) or local path (/banner.png)"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="shopifyBtnSecondary"
                            onClick={() => addHeroImageUrl(item.field)}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            + Add Slide
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Copy & Messaging for Desktop & Mobile */}
                  <div className="shopifyFormRow" style={{ marginTop: "10px" }}>
                    {[
                      { key: "desktop", label: "Desktop Banner Copy", hint: "Headline and button shown on desktop" },
                      { key: "mobile", label: "Mobile Banner Copy", hint: "Headline and button shown on phones" },
                    ].map((device) => {
                      const contentKey = device.key === "mobile" ? "heroMobileContent" : "heroDesktopContent";
                      const legacy = {
                        eyebrow: storeSettings.heroEyebrow ?? "",
                        heading: storeSettings.heroHeading ?? "",
                        supportingText: storeSettings.heroSupportingText ?? "",
                        primaryButtonText: storeSettings.heroPrimaryButtonText ?? "",
                        primaryButtonLink: storeSettings.heroPrimaryButtonLink ?? "",
                        secondaryButtonText: storeSettings.heroSecondaryButtonText ?? "",
                        secondaryButtonLink: storeSettings.heroSecondaryButtonLink ?? "",
                        alignment: storeSettings.heroTextAlignment || "left",
                        position: device.key === "mobile" ? "bottom" : (storeSettings.heroTextPosition || "left"),
                      };
                      const content = { ...legacy, ...(storeSettings[contentKey] || {}) };

                      return (
                        <div key={device.key} style={{ border: "1px solid #e2e8e5", borderRadius: "10px", padding: "16px", background: "#fdfefe", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div>
                            <span style={{ fontSize: "13.5px", fontWeight: 750, color: "#122a1e" }}>{device.label}</span>
                            <p style={{ fontSize: "11.5px", color: "#667a6e", margin: "2px 0 0 0" }}>{device.hint}</p>
                          </div>
                          <label className="shopifyFieldLabel">
                            Eyebrow
                            <input
                              className="shopifyInput"
                              value={content.eyebrow || ""}
                              onChange={(e) => updateHeroContent(device.key, { eyebrow: e.target.value })}
                              placeholder="e.g. NEW SEASON"
                            />
                          </label>
                          <label className="shopifyFieldLabel">
                            Main Heading
                            <input
                              className="shopifyInput"
                              value={content.heading || ""}
                              onChange={(e) => updateHeroContent(device.key, { heading: e.target.value })}
                              placeholder="e.g. Unstitched Luxury Lawn"
                            />
                          </label>
                          <label className="shopifyFieldLabel">
                            Supporting Description
                            <textarea
                              className="shopifyTextarea"
                              rows="2"
                              value={content.supportingText || ""}
                              onChange={(e) => updateHeroContent(device.key, { supportingText: e.target.value })}
                              placeholder="e.g. Crafted for effortless grace..."
                            />
                          </label>
                          <div className="shopifyFormRow">
                            <label className="shopifyFieldLabel">
                              Primary Button Text
                              <input
                                className="shopifyInput"
                                value={content.primaryButtonText || ""}
                                onChange={(e) => updateHeroContent(device.key, { primaryButtonText: e.target.value })}
                                placeholder="Shop Now"
                              />
                            </label>
                            <label className="shopifyFieldLabel">
                              Button Link
                              <input
                                className="shopifyInput"
                                value={content.primaryButtonLink || ""}
                                onChange={(e) => updateHeroContent(device.key, { primaryButtonLink: e.target.value })}
                                placeholder="#products or /category/kurtis"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overlay Slider */}
                  <label className="shopifyFieldLabel" style={{ marginTop: "8px" }}>
                    Dark Overlay Opacity: {Number(storeSettings.heroOverlayIntensity || 0)}%
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="1"
                      value={Number(storeSettings.heroOverlayIntensity || 0)}
                      onChange={(e) => setStoreSettings((current) => ({ ...current, heroOverlayIntensity: Number(e.target.value) }))}
                      style={{ accentColor: "#173d29", cursor: "pointer", marginTop: "6px" }}
                    />
                  </label>
                </div>
              </div>

              {/* Business Profile */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Store Business Profile</h3>
                    <p>Official legal details and customer contact channels.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Store Name
                      <input className="shopifyInput" defaultValue="Bustaniya" />
                    </label>
                    <label className="shopifyFieldLabel">
                      Legal Business Name
                      <input className="shopifyInput" defaultValue="Bustaniya" />
                    </label>
                  </div>
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Support Email
                      <input className="shopifyInput" defaultValue="hello@bustaniya.pk" />
                    </label>
                    <label className="shopifyFieldLabel">
                      Customer Support Phone
                      <input className="shopifyInput" placeholder="+92 3xx xxxxxxx" />
                    </label>
                  </div>
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Currency
                      <select className="shopifySelect" defaultValue="PKR">
                        <option>PKR (Pakistani Rupee)</option>
                      </select>
                    </label>
                    <label className="shopifyFieldLabel">
                      Timezone
                      <select className="shopifySelect" defaultValue="Asia/Karachi">
                        <option>Asia/Karachi (PKT)</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="shopifySettingsBottomBar">
                <button
                  type="submit"
                  className="shopifyBtnPrimary"
                  disabled={storeSettingsLoading}
                >
                  {storeSettingsLoading ? "Saving Store Settings..." : "💾 Save Store Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 2. HOMEPAGE SECTIONS */}
          {activeTab === "Sections" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Homepage Sections Builder</h3>
                    <p>Reorder sections, toggle visibility, and customize titles and content.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(storeSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((section, index, arr) => {
                      const isHero = section.type === "hero";
                      return (
                        <div
                          key={section.id}
                          style={{
                            border: "1.5px solid #e2e8e5",
                            borderRadius: "10px",
                            padding: "16px",
                            background: section.enabled !== false ? "#ffffff" : "#f8faf9",
                            opacity: section.enabled !== false ? 1 : 0.75,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isHero ? 0 : "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {/* Reorder arrows */}
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => setStoreSettings((current) => {
                                    const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                    [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
                                    return { ...current, homepageSections: sections };
                                  })}
                                  style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid #d4ded6", background: "#f8faf7", cursor: "pointer", display: "grid", placeItems: "center" }}
                                  title="Move Up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  disabled={index === arr.length - 1}
                                  onClick={() => setStoreSettings((current) => {
                                    const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                    [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
                                    return { ...current, homepageSections: sections };
                                  })}
                                  style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid #d4ded6", background: "#f8faf7", cursor: "pointer", display: "grid", placeItems: "center" }}
                                  title="Move Down"
                                >
                                  ↓
                                </button>
                              </div>
                              <div>
                                <span style={{ fontSize: "14px", fontWeight: 750, color: "#122a1e" }}>{section.label}</span>
                                <span style={{ fontSize: "11px", color: "#798c80", marginLeft: "8px", background: "#f0f4f1", padding: "2px 6px", borderRadius: "4px" }}>
                                  {section.type.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <label className="switchLabel">
                                <input
                                  type="checkbox"
                                  checked={section.enabled !== false}
                                  onChange={(e) => setStoreSettings((current) => {
                                    const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                    sections[index] = { ...sections[index], enabled: e.target.checked };
                                    return { ...current, homepageSections: sections };
                                  })}
                                /> Visible
                              </label>
                              {!isHero && (
                                <button
                                  type="button"
                                  onClick={() => setStoreSettings((current) => ({
                                    ...current,
                                    homepageSections: (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).filter((_, i) => i !== index),
                                  }))}
                                  style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
                                  title={\`Remove \${section.label}\`}
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {!isHero && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                              <div className="shopifyFormRow">
                                <label className="shopifyFieldLabel">
                                  Eyebrow
                                  <input
                                    className="shopifyInput"
                                    value={section.eyebrow || ""}
                                    placeholder="e.g. NEW ARRIVALS"
                                    onChange={(e) => setStoreSettings((current) => {
                                      const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                      sections[index] = { ...sections[index], eyebrow: e.target.value };
                                      return { ...current, homepageSections: sections };
                                    })}
                                  />
                                </label>
                                <label className="shopifyFieldLabel">
                                  Heading
                                  <input
                                    className="shopifyInput"
                                    value={section.heading || ""}
                                    placeholder="Section heading"
                                    onChange={(e) => setStoreSettings((current) => {
                                      const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                      sections[index] = { ...sections[index], heading: e.target.value };
                                      return { ...current, homepageSections: sections };
                                    })}
                                  />
                                </label>
                              </div>
                              <label className="shopifyFieldLabel">
                                Subtitle
                                <input
                                  className="shopifyInput"
                                  value={section.subtitle || ""}
                                  placeholder="Short description..."
                                  onChange={(e) => setStoreSettings((current) => {
                                    const sections = [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
                                    sections[index] = { ...sections[index], subtitle: e.target.value };
                                    return { ...current, homepageSections: sections };
                                  })}
                                />
                              </label>

                              {section.type === "shop_by_category" && (
                                <label className="shopifyFieldLabel">
                                  Category Display Style
                                  <select
                                    className="shopifySelect"
                                    value={section.style || storeSettings.categorySectionStyle || "atelier"}
                                    onChange={(e) => {
                                      const nextStyle = e.target.value;
                                      setStoreSettings((current) => {
                                        const sections = (current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((sec) =>
                                          sec.type === "shop_by_category" ? { ...sec, style: nextStyle } : sec
                                        );
                                        return { ...current, categorySectionStyle: nextStyle, homepageSections: sections };
                                      });
                                    }}
                                  >
                                    <option value="atelier">Atelier Overlay Cards (Dark Theme Overlay)</option>
                                    <option value="minimal">Minimal Collections Grid (House of Lucknawi Style)</option>
                                  </select>
                                </label>
                              )}

                              {section.type === "instagram_feed" && (
                                <div style={{ border: "1px solid #d4ded6", borderRadius: "8px", padding: "14px", background: "#f8faf7", marginTop: "6px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: 750, color: "#122a1e" }}>Instagram Reels Links</span>
                                    <button
                                      type="button"
                                      className="shopifyBtnSecondary"
                                      onClick={() => setStoreSettings((current) => ({
                                        ...current,
                                        instagramPosts: [
                                          ...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []),
                                          { id: \`instagram-\${Date.now()}\`, mediaType: "video", url: "", caption: "", image: "" },
                                        ],
                                      }))}
                                      style={{ fontSize: "11px", padding: "5px 10px" }}
                                    >
                                      + Add Reel
                                    </button>
                                  </div>

                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {(storeSettings.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []).map((post, postIndex) => (
                                      <div key={post.id || postIndex} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <input
                                          className="shopifyInput"
                                          value={post.url || ""}
                                          placeholder="https://www.instagram.com/reel/..."
                                          onChange={(e) => setStoreSettings((current) => {
                                            const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])];
                                            posts[postIndex] = { ...posts[postIndex], url: e.target.value };
                                            return { ...current, instagramPosts: posts };
                                          })}
                                          style={{ flex: 1 }}
                                        />
                                        <input
                                          className="shopifyInput"
                                          value={post.caption || ""}
                                          placeholder="Caption / Collection"
                                          onChange={(e) => setStoreSettings((current) => {
                                            const posts = [...(current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || [])];
                                            posts[postIndex] = { ...posts[postIndex], caption: e.target.value };
                                            return { ...current, instagramPosts: posts };
                                          })}
                                          style={{ width: "180px" }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setStoreSettings((current) => {
                                            const posts = (current.instagramPosts || DEFAULT_STORE_SETTINGS.instagramPosts || []).filter((_, pIdx) => pIdx !== postIndex);
                                            return { ...current, instagramPosts: posts };
                                          })}
                                          style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
                                        >
                                          <X size={15} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Available Section Dropdown */}
                  {(() => {
                    const currentTypes = (storeSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((s) => s.type);
                    const available = DEFAULT_HOMEPAGE_SECTIONS.filter((s) => !currentTypes.includes(s.type) && s.type !== "hero");
                    if (!available.length) return null;
                    return (
                      <div style={{ display: "flex", gap: "10px", marginTop: "14px", padding: "14px", border: "1px dashed #c0d1c5", borderRadius: "10px", background: "#f8faf7" }}>
                        <select id="sectionAddSelect" className="shopifySelect" defaultValue="" style={{ flex: 1 }}>
                          <option value="" disabled>Choose a section to add to homepage...</option>
                          {available.map((s) => <option key={s.type} value={s.type}>{s.label}</option>)}
                        </select>
                        <button
                          type="button"
                          className="shopifyBtnPrimary"
                          onClick={() => {
                            const select = document.getElementById("sectionAddSelect");
                            const type = select?.value;
                            if (!type) return;
                            const template = DEFAULT_HOMEPAGE_SECTIONS.find((s) => s.type === type);
                            if (!template) return;
                            setStoreSettings((current) => ({
                              ...current,
                              homepageSections: [...(current.homepageSections || DEFAULT_HOMEPAGE_SECTIONS), { ...template, id: \`\${template.id}-\${Date.now()}\` }],
                            }));
                            select.value = "";
                          }}
                        >
                          + Add Section
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Sections..." : "💾 Save Page Sections"}
                </button>
              </div>
            </form>
          )}

          {/* 3. SIZE GUIDE MATRIX */}
          {activeTab === "SizeChart" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Size Guide Configuration</h3>
                    <p>Customize the size guide modal title, fit advice, and measurement values shown across product pages.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Size Guide Title
                      <input
                        className="shopifyInput"
                        value={storeSettings.sizeChartSettings?.title || "Bustaniya Size Guide"}
                        onChange={(e) => updateSettingsGroup("sizeChartSettings", { title: e.target.value })}
                        placeholder="e.g. Bustaniya Size Guide"
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      Subtitle Note
                      <input
                        className="shopifyInput"
                        value={storeSettings.sizeChartSettings?.subtitle || "Standard Ready-to-Wear Measurements (Inches)"}
                        onChange={(e) => updateSettingsGroup("sizeChartSettings", { subtitle: e.target.value })}
                        placeholder="e.g. Standard Ready-to-Wear Measurements (Inches)"
                      />
                    </label>
                  </div>
                  <label className="shopifyFieldLabel">
                    Fit Advice Text
                    <textarea
                      className="shopifyTextarea"
                      rows="2"
                      value={storeSettings.sizeChartSettings?.advice || ""}
                      onChange={(e) => updateSettingsGroup("sizeChartSettings", { advice: e.target.value })}
                      placeholder="Fit advice shown under the measurements table..."
                    />
                  </label>
                </div>
              </div>

              {/* Dynamic Measurement Table */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Ready-to-Wear Measurement Matrix</h3>
                    <p>Garment measurements in inches across XS, S, M, L, XL.</p>
                  </div>
                  <button
                    type="button"
                    className="shopifyBtnSecondary"
                    onClick={() => {
                      const current = storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements;
                      const next = [
                        ...current,
                        { name: "NEW MEASUREMENT", values: { XS: "0", S: "0", M: "0", L: "0", XL: "0" } },
                      ];
                      updateSettingsGroup("sizeChartSettings", { measurements: next });
                    }}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    + Add Measurement
                  </button>
                </div>
                <div className="shopifySectionBody" style={{ padding: 0 }}>
                  <div className="shopifyTableWrap">
                    <table className="shopifyOrderTable">
                      <thead>
                        <tr>
                          <th>Measurement Name</th>
                          <th style={{ textAlign: "center", width: "90px" }}>XS</th>
                          <th style={{ textAlign: "center", width: "90px" }}>S</th>
                          <th style={{ textAlign: "center", width: "90px" }}>M</th>
                          <th style={{ textAlign: "center", width: "90px" }}>L</th>
                          <th style={{ textAlign: "center", width: "90px" }}>XL</th>
                          <th style={{ width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements).map((m, mIdx) => (
                          <tr key={mIdx}>
                            <td>
                              <input
                                className="shopifyInput"
                                style={{ fontWeight: 700, textTransform: "uppercase" }}
                                value={m.name || ""}
                                onChange={(e) => {
                                  const measurements = [...(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements)];
                                  measurements[mIdx] = { ...measurements[mIdx], name: e.target.value.toUpperCase() };
                                  updateSettingsGroup("sizeChartSettings", { measurements });
                                }}
                                placeholder="CHEST"
                              />
                            </td>
                            {["XS", "S", "M", "L", "XL"].map((sz) => (
                              <td key={sz} style={{ textAlign: "center" }}>
                                <input
                                  className="shopifyInput"
                                  style={{ textAlign: "center", width: "70px", margin: "0 auto" }}
                                  value={m.values?.[sz] || ""}
                                  onChange={(e) => {
                                    const measurements = [...(storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements)];
                                    const values = { ...(measurements[mIdx].values || {}), [sz]: e.target.value };
                                    measurements[mIdx] = { ...measurements[mIdx], values };
                                    updateSettingsGroup("sizeChartSettings", { measurements });
                                  }}
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const measurements = (storeSettings.sizeChartSettings?.measurements || DEFAULT_STORE_SETTINGS.sizeChartSettings.measurements).filter((_, i) => i !== mIdx);
                                  updateSettingsGroup("sizeChartSettings", { measurements });
                                }}
                                style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
                                title="Remove measurement"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Size Chart..." : "💾 Save Size Guide Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 4. PAYMENTS & COD */}
          {activeTab === "Payments" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Payment Methods</h3>
                    <p>Enable and configure payment options available to customers during checkout.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Cash on Delivery (COD)</b>
                      <span>Customer pays for the parcel upon delivery directly to the courier rider.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.paymentSettings?.codEnabled !== false}
                        onChange={(e) => updatePaymentSettings({ codEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Full Advance Payment (Free Delivery)</b>
                      <span>Customer pays the full amount in advance via bank transfer/JazzCash and receives 100% free delivery.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.paymentSettings?.manualTransferEnabled !== false}
                        onChange={(e) => updatePaymentSettings({ manualTransferEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>
                </div>
              </div>

              {/* COD Risk Rules */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Cash on Delivery (COD) Risk Rules</h3>
                    <p>Safeguards against fake or unverified COD orders.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Phone Verification Required</b>
                      <span>Mark unverified numbers in admin so staff confirms orders via WhatsApp before dispatch.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.paymentSettings?.codPhoneVerification !== false}
                        onChange={(e) => updatePaymentSettings({ codPhoneVerification: e.target.checked })}
                      /> Required
                    </label>
                  </div>

                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Minimum COD Order (PKR)
                      <input
                        type="number"
                        min="0"
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.codMinOrderPkr ?? 0}
                        onChange={(e) => updatePaymentSettings({ codMinOrderPkr: e.target.value })}
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      Maximum COD Order (PKR)
                      <input
                        type="number"
                        min="0"
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.codMaxOrderPkr ?? 50000}
                        onChange={(e) => updatePaymentSettings({ codMaxOrderPkr: e.target.value })}
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      COD Delivery Charge (PKR)
                      <input
                        type="number"
                        min="0"
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.codDeliveryChargePkr ?? 250}
                        onChange={(e) => updatePaymentSettings({ codDeliveryChargePkr: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Bank & WhatsApp Details */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Bank Receiving Details & WhatsApp Verification</h3>
                    <p>Bank details displayed for advance payment orders. Customers send their payment screenshot to WhatsApp.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Bank Name
                      <input
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.bankName || ""}
                        onChange={(e) => updatePaymentSettings({ bankName: e.target.value })}
                        placeholder="e.g. Meezan Bank / Nayapay"
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      Account Title
                      <input
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.bankTitle || ""}
                        onChange={(e) => updatePaymentSettings({ bankTitle: e.target.value })}
                        placeholder="e.g. Amna Butt / Bustaniya"
                      />
                    </label>
                  </div>
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Account Number
                      <input
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.bankAccountNumber || ""}
                        onChange={(e) => updatePaymentSettings({ bankAccountNumber: e.target.value })}
                        placeholder="0101010101..."
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      IBAN (Optional)
                      <input
                        className="shopifyInput"
                        value={storeSettings.paymentSettings?.bankIban || ""}
                        onChange={(e) => updatePaymentSettings({ bankIban: e.target.value })}
                        placeholder="PK..."
                      />
                    </label>
                  </div>
                  <label className="shopifyFieldLabel">
                    WhatsApp Support & Verification Phone Number
                    <input
                      type="tel"
                      className="shopifyInput"
                      value={storeSettings.paymentSettings?.whatsappNumber || ""}
                      onChange={(e) => updatePaymentSettings({ whatsappNumber: e.target.value })}
                      placeholder="923001234567"
                    />
                    <small>Powers the floating WhatsApp chat widget and the checkout payment-proof screenshot button.</small>
                  </label>
                </div>
              </div>

              {/* Checkout Instructions */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Checkout Payment Instructions</h3>
                    <p>Customize headings and instruction bullet points shown on the customer checkout page.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <PaymentInstructionEditor
                    title="1. Cash on Delivery (COD) Instructions"
                    headingValue={storeSettings.paymentSettings?.codHeading}
                    headingPlaceholder="Cash on Delivery Instructions"
                    instructionsValue={storeSettings.paymentSettings?.codInstructions}
                    onUpdateHeading={(heading) => updatePaymentSettings({ codHeading: heading })}
                    onUpdateInstructions={(text) => updatePaymentSettings({ codInstructions: text })}
                  />

                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #e2e8e5" }}>
                    <PaymentInstructionEditor
                      title="2. Full Advance Payment Instructions"
                      headingValue={storeSettings.paymentSettings?.advanceHeading}
                      headingPlaceholder="Full Advance Payment Instructions"
                      instructionsValue={storeSettings.paymentSettings?.instructions}
                      onUpdateHeading={(heading) => updatePaymentSettings({ advanceHeading: heading })}
                      onUpdateInstructions={(text) => updatePaymentSettings({ instructions: text })}
                    />
                  </div>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Payment Settings..." : "💾 Save Payment Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 5. SHIPPING & DELIVERY */}
          {activeTab === "Shipping" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Global Delivery Timeline & Copy</h3>
                    <p>Default delivery timeline and free shipping thresholds displayed across all products.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Estimated Delivery Timeline
                      <input
                        className="shopifyInput"
                        value={storeSettings.deliverySettings?.estimatedDays || ""}
                        onChange={(e) => updateDeliverySettings({ estimatedDays: e.target.value })}
                        placeholder="e.g. 8-9 delivery days"
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      Free Delivery Above Order (PKR)
                      <input
                        type="number"
                        min="0"
                        className="shopifyInput"
                        value={storeSettings.deliverySettings?.freeDeliveryThreshold ?? 5000}
                        onChange={(e) => updateDeliverySettings({ freeDeliveryThreshold: e.target.value })}
                        placeholder="5000"
                      />
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Standard Delivery Fee Copy
                    <input
                      className="shopifyInput"
                      value={storeSettings.deliverySettings?.deliveryFeeText || ""}
                      onChange={(e) => updateDeliverySettings({ deliveryFeeText: e.target.value })}
                      placeholder="e.g. Rs. 200 standard delivery nationwide · Free above Rs. 5,000"
                    />
                  </label>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Cash on Delivery Availability Badge</b>
                      <span>Highlight COD availability badge on product detail pages.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.deliverySettings?.codAvailable !== false}
                        onChange={(e) => updateDeliverySettings({ codAvailable: e.target.checked })}
                      /> Available
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Global Default Delivery Information Text
                    <textarea
                      className="shopifyTextarea"
                      rows="3"
                      value={storeSettings.deliverySettings?.defaultDeliveryInfo || ""}
                      onChange={(e) => updateDeliverySettings({ defaultDeliveryInfo: e.target.value })}
                      placeholder="Orders are processed within 24 hours and delivered within 8-9 delivery days across Pakistan..."
                    />
                  </label>
                </div>
              </div>

              {/* Shipping Zones Table */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Configured Shipping Zones & Rates</h3>
                    <p>Courier delivery rates based on destination city.</p>
                  </div>
                </div>
                <div className="shopifySectionBody" style={{ padding: 0 }}>
                  <div className="shopifyTableWrap">
                    <table className="shopifyOrderTable">
                      <thead>
                        <tr>
                          <th>Zone</th>
                          <th>Cities Covered</th>
                          <th>Delivery Rate</th>
                          <th>Free Above</th>
                          <th style={{ width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(shippingZones || []).map((zone, index) => (
                          <tr key={zone.id || index}>
                            <td><b>{zone.zone}</b></td>
                            <td>{zone.cities}</td>
                            <td>Rs. {Number(zone.rate || 0).toLocaleString()}</td>
                            <td>{Number(zone.freeAbove || 0) > 0 ? \`Rs. \${Number(zone.freeAbove).toLocaleString()}\` : "—"}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeShippingZone(index)}
                                style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", padding: "4px" }}
                                title="Remove zone"
                              >
                                <X size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Zone Inline Form */}
                  <div style={{ padding: "16px", borderTop: "1px solid #edf2ee", background: "#fafcfa" }}>
                    <span style={{ fontSize: "13px", fontWeight: 750, color: "#122a1e", display: "block", marginBottom: "10px" }}>
                      + Add Shipping Zone
                    </span>
                    <form onSubmit={addShippingZone} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr)) 90px", gap: "10px", alignItems: "flex-end" }}>
                      <input name="zone" className="shopifyInput" required placeholder="Zone Name (e.g. Karachi)" />
                      <input name="cities" className="shopifyInput" required placeholder="Cities (e.g. Karachi, Hyderabad)" />
                      <input name="rate" type="number" min="0" className="shopifyInput" required placeholder="Rate (PKR)" />
                      <input name="freeAbove" type="number" min="0" className="shopifyInput" placeholder="Free Above (PKR)" />
                      <button type="submit" className="shopifyBtnPrimary" style={{ height: "40px" }}>Add</button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Shipping..." : "💾 Save Shipping Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 6. CHECKOUT FLOW */}
          {activeTab === "Checkout" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Checkout Experience & Customer Options</h3>
                    <p>Control checkout friction, required contact info, and default payment method.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Guest Checkout</b>
                      <span>Let walk-in and Instagram customers place orders instantly without creating an account.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.checkoutSettings?.guestCheckoutEnabled !== false}
                        onChange={(e) => updateSettingsGroup("checkoutSettings", { guestCheckoutEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Phone Number Required</b>
                      <span>Mandatory for PostEx courier delivery and COD order confirmation.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.checkoutSettings?.phoneRequired !== false}
                        onChange={(e) => updateSettingsGroup("checkoutSettings", { phoneRequired: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Default Payment Selected
                      <select
                        className="shopifySelect"
                        value={storeSettings.checkoutSettings?.defaultPayment || "cod"}
                        onChange={(e) => updateSettingsGroup("checkoutSettings", { defaultPayment: e.target.value })}
                      >
                        <option value="cod">Cash on Delivery (COD)</option>
                        <option value="full_advance">Full Advance (Free Delivery)</option>
                      </select>
                    </label>
                    <label className="shopifyFieldLabel">
                      Customer Address Fields
                      <select
                        className="shopifySelect"
                        value={storeSettings.checkoutSettings?.addressMode || "detailed"}
                        onChange={(e) => updateSettingsGroup("checkoutSettings", { addressMode: e.target.value })}
                      >
                        <option value="detailed">Full Address Required (House, Street, Area)</option>
                        <option value="simple">Simple City & Address Only</option>
                      </select>
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Checkout Instructions / Note for Customers
                    <textarea
                      className="shopifyTextarea"
                      rows="3"
                      value={storeSettings.checkoutSettings?.checkoutNote || ""}
                      onChange={(e) => updateSettingsGroup("checkoutSettings", { checkoutNote: e.target.value })}
                      placeholder="e.g. Please ensure your delivery phone number is active for courier updates."
                    />
                  </label>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Checkout..." : "💾 Save Checkout Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 7. META PIXEL & CAPI */}
          {activeTab === "Tracking" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Meta Pixel & Conversions API (CAPI)</h3>
                    <p>Server-side tracking for Meta Ads, Instagram campaigns, and Google Analytics.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyFormRow">
                    <label className="shopifyFieldLabel">
                      Meta (Facebook) Pixel ID
                      <input
                        className="shopifyInput"
                        value={storeSettings.domainSettings?.metaPixelId || ""}
                        onChange={(e) => updateSettingsGroup("domainSettings", { metaPixelId: e.target.value })}
                        placeholder="e.g. 1972532723444962"
                      />
                    </label>
                    <label className="shopifyFieldLabel">
                      Google Analytics Measurement ID (GA4)
                      <input
                        className="shopifyInput"
                        value={storeSettings.domainSettings?.analyticsMeasurementId || ""}
                        onChange={(e) => updateSettingsGroup("domainSettings", { analyticsMeasurementId: e.target.value })}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Meta Conversions API (CAPI) System User Token
                    <textarea
                      className="shopifyTextarea"
                      rows="4"
                      value={storeSettings.domainSettings?.metaCapiAccessToken || ""}
                      onChange={(e) => updateSettingsGroup("domainSettings", { metaCapiAccessToken: e.target.value })}
                      placeholder="EAAN... (Paste your Meta System User Access Token here)"
                      style={{ fontFamily: "monospace", fontSize: "12px" }}
                    />
                  </label>
                </div>
              </div>

              {/* Live Events & Testing */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Standard Events & CAPI Verification</h3>
                    <p>Tracked events dispatched automatically to Meta Events Manager.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 18px", color: "#166534", fontSize: "13px", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 800, marginBottom: "4px" }}>🎯 Active Standard Events:</div>
                    <div>• <b>PageView</b> (All page loads nationwide)</div>
                    <div>• <b>ViewContent</b> (Product detail views with currency PKR)</div>
                    <div>• <b>AddToCart</b> (When product is added to cart)</div>
                    <div>• <b>InitiateCheckout</b> (When checkout page loads)</div>
                    <div>• <b>Purchase</b> (When customer places order successfully with full deduplication eventID)</div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="shopifyBtnPrimary"
                      onClick={testCapiConnection}
                      disabled={capiTesting}
                      style={{ background: "#2563eb", borderColor: "#1d4ed8" }}
                    >
                      {capiTesting ? "Testing CAPI..." : "⚡ Test Meta CAPI Connection"}
                    </button>
                    <a
                      href="https://eventsmanager.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shopifyBtnSecondary"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>Open Meta Events Manager</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {capiTestResult && (
                    <div style={{ padding: "12px 16px", borderRadius: "8px", background: capiTestResult.success ? "#f0fdf4" : "#fef2f2", border: \`1px solid \${capiTestResult.success ? "#bbf7d0" : "#fecaca"}\`, color: capiTestResult.success ? "#166534" : "#991b1b", fontSize: "13px", fontWeight: 600 }}>
                      {capiTestResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Tracking..." : "💾 Save Tracking Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 8. NOTIFICATIONS */}
          {activeTab === "Notifications" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Customer Email Notifications</h3>
                    <p>Templates sent to customers upon order placement and dispatch.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Order Confirmation Email</b>
                      <span>Send automated email receipt when customer completes checkout.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.notificationSettings?.orderConfirmationEnabled !== false}
                        onChange={(e) => updateSettingsGroup("notificationSettings", { orderConfirmationEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Email Subject Line
                    <input
                      className="shopifyInput"
                      value={storeSettings.notificationSettings?.orderConfirmationSubject || ""}
                      onChange={(e) => updateSettingsGroup("notificationSettings", { orderConfirmationSubject: e.target.value })}
                      placeholder="e.g. Your Bustaniya Order Confirmation"
                    />
                  </label>

                  <label className="shopifyFieldLabel">
                    Email Template Body
                    <textarea
                      className="shopifyTextarea"
                      rows="6"
                      value={storeSettings.notificationSettings?.orderConfirmationTemplate || ""}
                      onChange={(e) => updateSettingsGroup("notificationSettings", { orderConfirmationTemplate: e.target.value })}
                      placeholder="Assalam-o-Alaikum {customer_name}, thank you for ordering from Bustaniya..."
                    />
                  </label>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Fulfillment & PostEx Tracking Update</b>
                      <span>Notify customer when parcel is booked and assigned a PostEx tracking number.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.notificationSettings?.fulfillmentUpdateEnabled !== false}
                        onChange={(e) => updateSettingsGroup("notificationSettings", { fulfillmentUpdateEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>COD Phone Verification Reminder</b>
                      <span>Alert staff in dashboard when high-value COD orders need customer call verification.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.notificationSettings?.codVerificationReminderEnabled !== false}
                        onChange={(e) => updateSettingsGroup("notificationSettings", { codVerificationReminderEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Notifications..." : "💾 Save Notification Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 9. DOMAINS & SEO */}
          {activeTab === "Domains" && (
            <form onSubmit={saveStoreSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Domains & Search Engine Optimization</h3>
                    <p>Primary public storefront URL and default search metadata.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <label className="shopifyFieldLabel">
                    Primary Storefront Domain
                    <input
                      className="shopifyInput"
                      value={storeSettings.domainSettings?.primaryDomain || ""}
                      onChange={(e) => updateSettingsGroup("domainSettings", { primaryDomain: e.target.value })}
                      placeholder="e.g. bustaniya.pk"
                    />
                  </label>

                  <div className="shopifyToggleRow">
                    <div className="shopifyToggleRowLeft">
                      <b>Automatic www Redirect</b>
                      <span>Redirect www requests directly to primary domain for clean SEO.</span>
                    </div>
                    <label className="switchLabel">
                      <input
                        type="checkbox"
                        checked={storeSettings.domainSettings?.wwwRedirect !== false}
                        onChange={(e) => updateSettingsGroup("domainSettings", { wwwRedirect: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  <label className="shopifyFieldLabel">
                    Default Homepage SEO Title
                    <input
                      className="shopifyInput"
                      value={storeSettings.domainSettings?.seoTitle || ""}
                      onChange={(e) => updateSettingsGroup("domainSettings", { seoTitle: e.target.value })}
                      placeholder="e.g. Bustaniya | Luxury Unstitched & Ready-to-Wear"
                    />
                  </label>
                </div>
              </div>

              <div className="shopifySettingsBottomBar">
                <button type="submit" className="shopifyBtnPrimary" disabled={storeSettingsLoading}>
                  {storeSettingsLoading ? "Saving Domain..." : "💾 Save Domain Settings"}
                </button>
              </div>
            </form>
          )}

          {/* 10. STAFF & USERS */}
          {activeTab === "Users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {staffError && <div className="adminErrorBanner">⚠️ {staffError}</div>}
              {staffSaved && <div className="adminErrorBanner settingsSaved">✅ {staffSaved}</div>}

              {/* Staff Accounts Table */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Admin Staff Accounts</h3>
                    <p>{currentAdminUser ? \`Signed in as \${currentAdminUser.name} (\${currentAdminUser.role})\` : "Manage team access"}</p>
                  </div>
                  {staffLoading && <span style={{ fontSize: "12px", color: "#667a6e" }}>Refreshing...</span>}
                </div>
                <div className="shopifySectionBody" style={{ padding: 0 }}>
                  <div className="shopifyTableWrap">
                    <table className="shopifyOrderTable">
                      <thead>
                        <tr>
                          <th>Team Member</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Permissions</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#173d29", color: "#ffffff", display: "grid", placeItems: "center", fontSize: "12px", fontWeight: 800 }}>
                                  {(user.name || "U").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <b style={{ color: "#122a1e" }}>{user.name}</b>
                                  <small style={{ display: "block", color: "#798c80", fontSize: "11px" }}>
                                    {user.lastLoginAt ? \`Last login \${new Date(user.lastLoginAt).toLocaleDateString("en-PK")}\` : "No login yet"}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <span className={\`shopifyPill \${user.role === "Owner" ? "paid" : "in_transit"}\`}>
                                {user.role}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {(user.permissions || []).map((perm) => (
                                  <span key={perm} style={{ fontSize: "10.5px", background: "#f0f4f1", color: "#32463a", padding: "2px 6px", borderRadius: "4px" }}>
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className={\`shopifyPill \${user.status === "Active" ? "paid" : "returned"}\`}>
                                <span className="pillDot" /> {user.status}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="shopifyRowBtn"
                                  onClick={() => updateStaffUser(user.id, { status: user.status === "Active" ? "Disabled" : "Active" })}
                                >
                                  {user.status === "Active" ? "Disable" : "Enable"}
                                </button>
                                {user.role !== "Owner" && (
                                  <button
                                    type="button"
                                    className="shopifyRowBtn danger"
                                    onClick={() => deleteStaffUser(user.id)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Add Staff User Form */}
              <div className="shopifySectionCard">
                <div className="shopifySectionHeader">
                  <div>
                    <h3>Add New Admin User</h3>
                    <p>Grant access to employees or workshop managers with custom permissions.</p>
                  </div>
                </div>
                <div className="shopifySectionBody">
                  <form onSubmit={addStaff} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className="shopifyFormRow">
                      <label className="shopifyFieldLabel">
                        Full Name
                        <input name="name" required className="shopifyInput" placeholder="e.g. Asad Ali" />
                      </label>
                      <label className="shopifyFieldLabel">
                        Login Email
                        <input name="email" type="email" required className="shopifyInput" placeholder="asad@bustaniya.pk" />
                      </label>
                    </div>
                    <div className="shopifyFormRow">
                      <label className="shopifyFieldLabel">
                        Account Password
                        <input name="password" type="password" minLength="10" required className="shopifyInput" placeholder="Minimum 10 characters" />
                      </label>
                      <label className="shopifyFieldLabel">
                        Role
                        <select name="role" defaultValue="Staff" className="shopifySelect">
                          <option>Staff</option>
                          <option>Owner</option>
                        </select>
                      </label>
                    </div>

                    <label className="shopifyFieldLabel">
                      Granular Feature Access Permissions
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginTop: "8px" }}>
                        {availablePermissions.map((permission) => (
                          <label key={permission} className="switchLabel" style={{ fontSize: "13px" }}>
                            <input
                              name={\`permission-\${permission}\`}
                              type="checkbox"
                              defaultChecked={["dashboard", "orders"].includes(permission)}
                            /> {permission}
                          </label>
                        ))}
                      </div>
                    </label>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                      <button
                        type="submit"
                        className="shopifyBtnPrimary"
                        disabled={staffLoading}
                      >
                        {staffLoading ? "Adding User..." : "Add Admin User"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* 11. SYSTEM HEALTH */}
          {activeTab === "System" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <BackendHealthPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

content = content.slice(0, startIndex) + newSettingsPanelCode + "\n\n" + content.slice(endIndex);
fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated SettingsPanel to Shopify standard!");
