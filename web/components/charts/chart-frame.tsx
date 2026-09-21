"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/locale-provider";
import { Panel } from "@/components/ui/panel";

type ChartTable = {
  columns: string[];
  rows: ReactNode[][];
};

/**
 * Standard chart container: title, responsive chart region, empty state, and
 * an expandable accessible data table exposing the same values.
 */
export function ChartFrame({ title, children, table, empty = false, emptyText, height = 280 }: Readonly<{ title: string; children: ReactNode; table: ChartTable; empty?: boolean; emptyText: string; height?: number }>) {
  const t = useT();

  return (
    <Panel>
      <h2 className="text-lg font-semibold">{title}</h2>
      {empty ? (
        <p className="mt-4 text-sm text-[#5d716b]">{emptyText}</p>
      ) : (
        <div className="mt-4 w-full" style={{ height }} role="img" aria-label={title}>
          {children}
        </div>
      )}
      {table.rows.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#0f4c4c] focus:outline-none focus:ring-2 focus:ring-[#d9ad5b] rounded">
            {t("analysis.chartTableToggle")}
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#d9cdb9]">
                  {table.columns.map((column) => <th key={column} scope="col" className="py-2 pr-4 font-semibold">{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index} className="border-b border-[#eee7da] last:border-0">
                    {row.map((cell, cellIndex) => <td key={cellIndex} className="py-2 pr-4">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Panel>
  );
}
