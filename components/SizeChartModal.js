"use client";

import { X, Ruler } from "lucide-react";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";

export function SizeTable({ chartData }) {
  const defaults = DEFAULT_STORE_SETTINGS.sizeChartSettings;
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
  const title = chartData?.title || defaults.title;
  const subtitle = chartData?.subtitle || defaults.subtitle;
  const advice = chartData?.advice || defaults.advice;

  return (
    <>
      <div className="sizeChartOverlay" onClick={onClose} />
      <div className="sizeChartModal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sizeChartHeader">
          <div className="sizeChartTitleGroup">
            <Ruler className="sizeChartIcon" size={20} />
            <div>
              <h3>{title}</h3>
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
