"use client";

import { useMemo, useState } from "react";
import { Check, Palette, Plus, Search, Trash2, X } from "lucide-react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { fashionColorCategories, fashionColors, getColorHex, suggestColorName } from "../data/variantOptions";

export default function ProductColorPicker({
  selectedColors = [],
  onChange,
}) {
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "custom"
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom color picker state
  const [customHex, setCustomHex] = useState("#173d29");
  const [customName, setCustomName] = useState("Forest Green");
  const [customNameEdited, setCustomNameEdited] = useState(false);

  // Handle color picker change
  function handleHexChange(newHex) {
    setCustomHex(newHex);
    if (!customNameEdited) {
      const suggested = suggestColorName(newHex);
      setCustomName(suggested);
    }
  }

  // Toggle preset color
  function toggleColor(colorName) {
    if (!onChange) return;
    if (selectedColors.includes(colorName)) {
      onChange(selectedColors.filter((c) => c !== colorName));
    } else {
      onChange([...selectedColors, colorName]);
    }
  }

  // Remove a selected color
  function removeColor(colorName) {
    if (!onChange) return;
    onChange(selectedColors.filter((c) => c !== colorName));
  }

  // Add custom color from spectrum
  function handleAddCustomColor(e) {
    e.preventDefault();
    if (!customName.trim()) return;
    const finalName = customName.trim();
    if (!selectedColors.includes(finalName)) {
      if (onChange) onChange([...selectedColors, finalName]);
    }
    // Reset custom name edit flag for next pick
    setCustomNameEdited(false);
  }

  // Filtered presets
  const filteredColors = useMemo(() => {
    let list = fashionColors;
    if (activeCategory !== "all") {
      list = list.filter((c) => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, searchQuery]);

  return (
    <div className="productColorPickerRoot">
      {/* 1. SELECTED COLORS PILL TRAY */}
      <div className="pcpSelectedTray">
        <div className="pcpSelectedHeader">
          <span className="pcpSelectedCount">
            <strong>{selectedColors.length}</strong> {selectedColors.length === 1 ? "color" : "colors"} selected for this product
          </span>
          {selectedColors.length > 0 && (
            <button
              type="button"
              className="pcpClearBtn"
              onClick={() => onChange && onChange([])}
              title="Remove all colors"
            >
              <Trash2 size={13} /> Clear all
            </button>
          )}
        </div>
        <div className="pcpChipsList">
          {selectedColors.length === 0 ? (
            <span className="pcpEmptyNote">No colors selected yet. Choose from palette or use the custom picker below.</span>
          ) : (
            selectedColors.map((colorName) => {
              const hex = getColorHex(colorName);
              return (
                <span key={colorName} className="pcpSelectedChip">
                  <span className="pcpChipDot" style={{ background: hex }} />
                  <span className="pcpChipLabel">{colorName}</span>
                  <button
                    type="button"
                    className="pcpChipRemove"
                    onClick={() => removeColor(colorName)}
                    aria-label={`Remove ${colorName}`}
                    title={`Remove ${colorName}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MODE SELECTOR TABS */}
      <div className="pcpNavTabs">
        <button
          type="button"
          className={`pcpNavTab ${activeTab === "presets" ? "active" : ""}`}
          onClick={() => setActiveTab("presets")}
        >
          <Palette size={14} /> Color Palette ({fashionColors.length}+ shades)
        </button>
        <button
          type="button"
          className={`pcpNavTab ${activeTab === "custom" ? "active" : ""}`}
          onClick={() => setActiveTab("custom")}
        >
          <Plus size={14} /> Custom Spectrum Wheel / Hex Picker
        </button>
      </div>

      {/* 3. PRESET PALETTE VIEW */}
      {activeTab === "presets" && (
        <div className="pcpPresetsPanel">
          {/* Search bar */}
          <div className="pcpSearchBar">
            <Search size={15} className="pcpSearchIcon" />
            <input
              type="text"
              placeholder="Search by color name (e.g. Maroon, Emerald, Powder Blue, Rust)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pcpSearchInput"
            />
            {searchQuery && (
              <button
                type="button"
                className="pcpSearchClear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="pcpCategoryPills">
            {fashionColorCategories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`pcpCatPill ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Color Chips Grid */}
          <div className="pcpGrid">
            {filteredColors.map((color) => {
              const isSelected = selectedColors.includes(color.name);
              return (
                <button
                  type="button"
                  key={color.name}
                  className={`pcpColorBtn ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleColor(color.name)}
                  title={`${color.name} (${color.hex})`}
                >
                  <span className="pcpDot" style={{ background: color.hex }} />
                  <span className="pcpName">{color.name}</span>
                  {isSelected && <Check size={13} className="pcpCheck" />}
                </button>
              );
            })}
          </div>

          {filteredColors.length === 0 && (
            <div className="pcpNoResults">
              <p>No colors found matching &ldquo;{searchQuery}&rdquo;.</p>
              <button
                type="button"
                className="pcpSwitchToCustomBtn"
                onClick={() => {
                  setCustomName(searchQuery);
                  setActiveTab("custom");
                }}
              >
                + Create &ldquo;{searchQuery}&rdquo; in Custom Picker
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. CUSTOM SPECTRUM / WHEEL VIEW */}
      {activeTab === "custom" && (
        <div className="pcpCustomPanel">
          <div className="pcpCustomLayout">
            <div className="pcpWheelContainer">
              <HexColorPicker color={customHex} onChange={handleHexChange} />
            </div>

            <div className="pcpCustomControls">
              <div className="pcpPreviewBox">
                <div className="pcpBigDot" style={{ background: customHex }} />
                <div className="pcpPreviewMeta">
                  <span className="pcpPreviewLabel">Picked Shade</span>
                  <strong className="pcpPreviewHex">{customHex.toUpperCase()}</strong>
                </div>
              </div>

              <div className="pcpInputRow">
                <label className="pcpInputLabel">
                  <span>Hex Code</span>
                  <div className="pcpHexInputWrapper">
                    <span className="pcpHexPrefix">#</span>
                    <HexColorInput
                      color={customHex}
                      onChange={handleHexChange}
                      prefixed={false}
                      className="pcpHexInput"
                    />
                  </div>
                </label>

                <label className="pcpInputLabel">
                  <span>Color Name</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setCustomNameEdited(true);
                    }}
                    placeholder="e.g. Royal Maroon, Ice Blue"
                    className="pcpNameInput"
                  />
                  <small className="pcpInputHint">Auto-suggested fashion name. Edit anytime.</small>
                </label>
              </div>

              <button
                type="button"
                className="pcpAddCustomBtn"
                onClick={handleAddCustomColor}
              >
                <Plus size={16} /> Add &ldquo;{customName || "Color"}&rdquo; to Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
