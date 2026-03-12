/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, {useState, useEffect} from 'react';
import {XMarkIcon, DocumentArrowDownIcon} from '@heroicons/react/24/outline';
import {ColumnDefinition, TableRow} from './types';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition[];
  rows: TableRow[];
  tableName: string;
}

export default function PDFExportModal({isOpen, onClose, columns, rows, tableName}: PDFExportModalProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [stripedRows, setStripedRows] = useState(true);

  // Init equal widths
  useEffect(() => {
    if (!isOpen) return;
    const equal = Math.floor(100 / columns.length);
    const init: Record<string, number> = {};
    columns.forEach((c, i) => {
      init[c.id] = i === columns.length - 1 ? 100 - equal * (columns.length - 1) : equal;
    });
    setColWidths(init);
  }, [isOpen, columns]);

  const total = Object.values(colWidths).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - 100) <= 1;

  const handleSlider = (id: string, val: number) => {
    setColWidths(prev => ({...prev, [id]: Math.max(3, val)}));
  };

  const normalize = () => {
    const sum = Object.values(colWidths).reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const normed: Record<string, number> = {};
    const ids = Object.keys(colWidths);
    ids.forEach((id, i) => {
      normed[id] =
        i === ids.length - 1
          ? 100 - ids.slice(0, -1).reduce((acc, k) => acc + Math.round((colWidths[k] / sum) * 100), 0)
          : Math.round((colWidths[id] / sum) * 100);
    });
    setColWidths(normed);
  };

  const flattenRows = (items: TableRow[], depth = 0): {row: TableRow; depth: number}[] => {
    const result: {row: TableRow; depth: number}[] = [];
    for (const row of items) {
      result.push({row, depth});
      if (row.isExpanded && row.children) {
        result.push(...flattenRows(row.children, depth + 1));
      }
    }
    return result;
  };

  const handleExport = async () => {
    setGenerating(true);
    try {
      const {default: jsPDF} = await import('jspdf');
      const {default: autoTable} = await import('jspdf-autotable');

      const doc = new jsPDF({orientation, unit: 'mm', format: 'a4'});
      const pageWidth = orientation === 'landscape' ? 297 : 210;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      // Title
      let startY = margin;
      if (includeTitle) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 30);
        doc.text(tableName, margin, startY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}),
          margin,
          startY + 12,
        );
        startY += 18;
      }

      // Column widths in mm
      const colWidthsMM = columns.map(c => ((colWidths[c.id] ?? 10) / 100) * contentWidth);

      // Build body
      const flatRows = flattenRows(rows);
      const body = flatRows.map(({row, depth}) =>
        columns.map(col => {
          const isName = col.id === 'name';
          let val = row.data[col.id] ?? '';
          if (isName) val = '  '.repeat(depth) + val;
          if (col.type === 'status' && col.options) {
            const opt = col.options.find(o => o.id === val);
            if (opt) val = opt.label;
          }
          if (col.type === 'currency' && val) {
            val = `$${Number(val).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
          }
          return String(val ?? '');
        }),
      );

      autoTable(doc, {
        startY,
        head: [columns.map(c => c.label)],
        body,
        margin: {left: margin, right: margin},
        tableWidth: contentWidth,
        columnStyles: Object.fromEntries(
          columns.map((c, i) => [
            i,
            {
              cellWidth: colWidthsMM[i],
              halign: (c.align || 'left') as any,
              overflow: 'linebreak',
            },
          ]),
        ),
        headStyles: {
          fillColor: [245, 246, 248],
          textColor: [55, 65, 81],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: {top: 4, bottom: 4, left: 4, right: 4},
          lineColor: [209, 213, 219],
          lineWidth: 0.3,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [31, 41, 55],
          cellPadding: {top: 3.5, bottom: 3.5, left: 4, right: 4},
          lineColor: [229, 231, 235],
          lineWidth: 0.2,
          overflow: 'linebreak',
          minCellHeight: 8,
        },
        alternateRowStyles: stripedRows ? {fillColor: [249, 250, 251]} : {},
        didParseCell: data => {
          const {row: tableRow, cell} = data;
          if (data.section === 'body') {
            const sourceRow = flatRows[tableRow.index];
            if (sourceRow?.row.type === 'stream' && data.column.index === 0) {
              cell.styles.fontStyle = 'bold';
              cell.styles.fillColor = [243, 244, 246];
            }
          }
        },
        showHead: 'everyPage',
        theme: 'plain',
      });

      // Footer with page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 210 - 6, {align: 'right'});
      }

      doc.save(`${tableName}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('PDF export failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <DocumentArrowDownIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Export as PDF</h3>
              <p className="text-[11px] text-gray-400">Configure layout before exporting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Orientation */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Page Orientation
            </label>
            <div className="flex gap-2">
              {(['portrait', 'landscape'] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setOrientation(o)}
                  className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${
                    orientation === o ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {/* Paper icon */}
                  <div
                    className={`rounded border-2 ${orientation === o ? 'border-indigo-400' : 'border-gray-300'} ${
                      o === 'portrait' ? 'w-8 h-11' : 'w-11 h-8'
                    } flex items-center justify-center`}>
                    <div className={`${o === 'portrait' ? 'w-5 h-7' : 'w-7 h-5'} space-y-0.5`}>
                      {[...Array(o === 'portrait' ? 5 : 4)].map((_, i) => (
                        <div key={i} className={`h-px ${orientation === o ? 'bg-indigo-300' : 'bg-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium capitalize ${
                      orientation === o ? 'text-indigo-700' : 'text-gray-500'
                    }`}>
                    {o}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-4">
            {[
              {label: 'Include title', value: includeTitle, set: setIncludeTitle},
              {label: 'Striped rows', value: stripedRows, set: setStripedRows},
            ].map(opt => (
              <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => opt.set(!opt.value)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative ${
                    opt.value ? 'bg-indigo-500' : 'bg-gray-300'
                  }`}
                  style={{height: '18px', width: '32px'}}>
                  <div
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                      opt.value ? 'translate-x-[14px]' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-xs text-gray-600">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Column widths */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Column Widths</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                  Total: {total}%
                </span>
                <button
                  onClick={normalize}
                  className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors">
                  Auto-balance
                </button>
              </div>
            </div>

            {/* Width bar preview */}
            <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-px bg-gray-100">
              {columns.map((col, i) => {
                const hues = [221, 262, 142, 43, 0, 189, 316, 24];
                return (
                  <div
                    key={col.id}
                    style={{
                      width: `${colWidths[col.id] ?? 0}%`,
                      backgroundColor: `hsl(${hues[i % hues.length]},70%,60%)`,
                    }}
                    className="h-full transition-all"
                    title={`${col.label}: ${colWidths[col.id]}%`}
                  />
                );
              })}
            </div>

            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {columns.map((col, i) => {
                const hues = [221, 262, 142, 43, 0, 189, 316, 24];
                return (
                  <div key={col.id} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{backgroundColor: `hsl(${hues[i % hues.length]},70%,60%)`}}
                    />
                    <span className="text-xs text-gray-600 w-28 truncate">{col.label}</span>
                    <input
                      type="range"
                      min={3}
                      max={70}
                      value={colWidths[col.id] ?? 10}
                      onChange={e => handleSlider(col.id, Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{colWidths[col.id]}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={generating}
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
