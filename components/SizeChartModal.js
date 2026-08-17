"use client";

import { useState } from "react";
import { X, Ruler } from "lucide-react";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

export function SizeTable({ chartData }) {
  const [unit, setUnit] = useState("INCHES");
  const defaults = DEFAULT_STORE_SETTINGS.sizeChartSettings;

  const sizes = chartData?.sizes || defaults.sizes || ["XS", "S", "M", "L", "XL"];
  const measurements = chartData?.measurements || defaults.measurements;

  if (measurements && measurements.length) {
    return (
      <div className="sizeChartContainer">
        <div className="sizeChartUnitHeader">
          <div className="unitToggleSwitch">
            <button
              type="button"
              className={`unitToggleOption ${unit === "INCHES" ? "active" : ""}`}
              onClick={() => setUnit("INCHES")}
            >
              INCHES
            </button>
            <span className="unitDivider">|</span>
            <button
              type="button"
              className={`unitToggleOption ${unit === "CM" ? "active" : ""}`}
              onClick={() => setUnit("CM")}
            >
              CM
            </button>
          </div>
        </div>

        <div className="sizeChartTableWrap">
          <table className="sizeChartTable">
            <thead>
              <tr>
                <th>SIZE</th>
                {sizes.map((sz) => (
                  <th key={sz}>{sz}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((m, idx) => (
                <tr key={idx}>
                  <td className="measurementName">{m.name}</td>
                  {sizes.map((sz) => {
                    const rawVal = m.values?.[sz] || "—";
                    if (rawVal === "—") return <td key={sz}>—</td>;
                    const num = parseFloat(rawVal);
                    if (isNaN(num)) return <td key={sz}>{rawVal}</td>;
                    const displayVal = unit === "CM" ? (Math.round(num * 2.54 * 10) / 10).toString() : rawVal;
                    return <td key={sz}>{displayVal}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback for legacy custom rows
  const columns = chartData?.columns || defaults.columns;
  const rows = chartData?.rows || defaults.rows;

  return (
    <div className="sizeChartTableWrap">
      <table className="sizeChartTable">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              <td><span className="sizeBadge">{row.size || `Size ${rIdx + 1}`}</span></td>
              <td>{row.chest || "—"}</td>
              <td>{row.shoulder || "—"}</td>
              <td>{row.waist || "—"}</td>
              <td>{row.hips || "—"}</td>
              <td>{row.length || "—"}</td>
              <td>{row.trouser || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SizeChartModal({ isOpen, onClose, chartData }) {
  if (!isOpen) return null;

  const defaults = DEFAULT_STORE_SETTINGS.sizeChartSettings;
  const subtitle = chartData?.subtitle || defaults.subtitle;
  const advice = chartData?.advice || defaults.advice;

  return (
    <>
      <div className="sizeChartOverlay" onClick={onClose} />
      <div className="sizeChartModal" role="dialog" aria-modal="true" aria-label="Bustaniya Size Guide">
        <div className="sizeChartHeader">
          <div className="sizeChartTitleGroup">
            <Ruler className="sizeChartIcon" size={20} />
            <div>
              <h3>Bustaniya Official Size Guide</h3>
              <p>{subtitle}</p>
            </div>
          </div>
          <button type="button" className="sizeChartCloseBtn" onClick={onClose} aria-label="Close size guide">
            <X size={18} />
          </button>
        </div>

        <SizeTable chartData={chartData} />

        {advice && (
          <div className="sizeChartTip">
            <p>{advice}</p>
          </div>
        )}
      </div>
    </>
  );
}
