"use client";

import { X, Ruler } from "lucide-react";

export function SizeTable() {
  return (
    <div className="sizeChartTableWrap">
      <table className="sizeChartTable">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest</th>
            <th>Shoulder</th>
            <th>Waist</th>
            <th>Hips</th>
            <th>Shirt Length</th>
            <th>Trouser</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span className="sizeBadge">Small (S)</span></td>
            <td>19&quot;</td>
            <td>14&quot;</td>
            <td>18&quot;</td>
            <td>20&quot;</td>
            <td>38&quot; – 40&quot;</td>
            <td>37&quot;</td>
          </tr>
          <tr>
            <td><span className="sizeBadge">Medium (M)</span></td>
            <td>20.5&quot;</td>
            <td>14.5&quot;</td>
            <td>19.5&quot;</td>
            <td>21.5&quot;</td>
            <td>39&quot; – 41&quot;</td>
            <td>38&quot;</td>
          </tr>
          <tr>
            <td><span className="sizeBadge">Large (L)</span></td>
            <td>22&quot;</td>
            <td>15&quot;</td>
            <td>21&quot;</td>
            <td>23&quot;</td>
            <td>40&quot; – 42&quot;</td>
            <td>39&quot;</td>
          </tr>
          <tr>
            <td><span className="sizeBadge">X-Large (XL)</span></td>
            <td>24&quot;</td>
            <td>16&quot;</td>
            <td>23&quot;</td>
            <td>25&quot;</td>
            <td>41&quot; – 43&quot;</td>
            <td>40&quot;</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function SizeChartModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="sizeChartOverlay" onClick={onClose} />
      <div className="sizeChartModal" role="dialog" aria-modal="true" aria-label="Bustaniya Size Guide">
        <div className="sizeChartHeader">
          <div className="sizeChartTitleGroup">
            <Ruler className="sizeChartIcon" size={20} />
            <div>
              <h3>Bustaniya Size Guide</h3>
              <p>Standard Ready-to-Wear Measurements (Inches)</p>
            </div>
          </div>
          <button type="button" className="sizeChartCloseBtn" onClick={onClose} aria-label="Close size guide">
            <X size={18} />
          </button>
        </div>

        <SizeTable />

        <div className="sizeChartTip">
          <p>💡 <b>Fit Advice:</b> Measurements shown are for ready stitched garments in inches. For a loose/relaxed fit or if you are between two sizes, we recommend selecting the larger size.</p>
        </div>
      </div>
    </>
  );
}
