"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2, PieChart, LayoutGrid } from "lucide-react";

// ──────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────

export type MetricGridItem = {
    label: string;
    value: string | number;
    subtext?: string;
    trend?: "up" | "down" | "neutral";
};

export type MetricGridData = {
    type: "metric-grid";
    title?: string;
    items: MetricGridItem[];
};

export type TrendPoint = {
    label: string;
    value: number;
    unit?: string;
};

export type TrendData = {
    type: "trend";
    title?: string;
    points: TrendPoint[];
    baseline?: number;
    unit?: string;
};

export type ComparisonItem = {
    label: string;
    value: number;
    unit?: string;
    subtext?: string;
};

export type ComparisonData = {
    type: "comparison";
    title?: string;
    items: ComparisonItem[];
    unit?: string;
};

export type DistributionSegment = {
    label: string;
    value: number;
    unit?: string;
};

export type DistributionData = {
    type: "distribution";
    title?: string;
    segments: DistributionSegment[];
    totalLabel?: string;
};

export type VisualizationData = MetricGridData | TrendData | ComparisonData | DistributionData;

// ──────────────────────────────────────────────────────────────
// Deterministic Semantic Palette (Frontend Controlled)
// ──────────────────────────────────────────────────────────────

const PALETTE = [
    { text: "text-cyan-400", bg: "bg-cyan-500", border: "border-cyan-500/30", fill: "#22d3ee", hex: "#06b6d4" },
    { text: "text-indigo-400", bg: "bg-indigo-500", border: "border-indigo-500/30", fill: "#818cf8", hex: "#6366f1" },
    { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/30", fill: "#34d399", hex: "#10b981" },
    { text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/30", fill: "#fbbf24", hex: "#f59e0b" },
    { text: "text-rose-400", bg: "bg-rose-500", border: "border-rose-500/30", fill: "#fb7185", hex: "#f43f5e" },
    { text: "text-purple-400", bg: "bg-purple-500", border: "border-purple-500/30", fill: "#c084fc", hex: "#a855f7" },
];

function getSemanticColor(label: string, index: number) {
    const lower = label.toLowerCase();
    if (lower.includes("focus") || lower.includes("deep") || lower.includes("work")) return PALETTE[0]; // cyan
    if (lower.includes("break") || lower.includes("rest") || lower.includes("recover")) return PALETTE[2]; // emerald
    if (lower.includes("distraction") || lower.includes("avoid") || lower.includes("tax") || lower.includes("loss")) return PALETTE[4]; // rose
    if (lower.includes("urgent") || lower.includes("critical") || lower.includes("streak") || lower.includes("stagnant")) return PALETTE[3]; // amber
    return PALETTE[index % PALETTE.length];
}

// ──────────────────────────────────────────────────────────────
// 1. Metric Grid Component
// ──────────────────────────────────────────────────────────────

function MetricGridRenderer({ data }: { data: MetricGridData }) {
    if (!data.items || data.items.length === 0) return null;
    const items = data.items.slice(0, 4);

    return (
        <div className="my-3.5 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 shadow-md">
            {data.title && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/60">
                    <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{data.title}</span>
                </div>
            )}
            <div className={`grid gap-3 ${items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-2" : items.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                {items.map((item, idx) => {
                    return (
                        <div key={idx} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex flex-col justify-between">
                            <span className="text-[11px] font-medium text-zinc-400 truncate block mb-1">{item.label}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold font-mono text-white tracking-tight">{item.value}</span>
                                {item.trend && (
                                    <span className="shrink-0 text-xs">
                                        {item.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400 inline" />}
                                        {item.trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400 inline" />}
                                        {item.trend === "neutral" && <Minus className="w-3 h-3 text-zinc-500 inline" />}
                                    </span>
                                )}
                            </div>
                            {item.subtext && <span className="text-[10px] text-zinc-500 mt-1 truncate">{item.subtext}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// 2. Trend Sparkline / Chart Component
// ──────────────────────────────────────────────────────────────

function TrendChartRenderer({ data }: { data: TrendData }) {
    if (!data.points || data.points.length === 0) return null;
    const points = data.points;
    const values = points.map(p => p.value);
    const minVal = 0;
    const maxVal = Math.max(...values, data.baseline || 0, 1);
    const unit = data.unit || points[0]?.unit || "";

    const width = 340;
    const height = 90;
    const paddingX = 20;
    const paddingY = 16;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;

    const coords = points.map((p, idx) => {
        const x = paddingX + (idx / Math.max(1, points.length - 1)) * chartW;
        const y = height - paddingY - ((p.value - minVal) / (maxVal - minVal)) * chartH;
        return { x, y, ...p };
    });

    const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
    const areaD = coords.length > 0
        ? `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
        : "";

    const baselineY = data.baseline !== undefined
        ? height - paddingY - ((data.baseline - minVal) / (maxVal - minVal)) * chartH
        : null;

    return (
        <div className="my-3.5 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{data.title || "Execution Trend"}</span>
                </div>
                {unit && <span className="text-[10px] font-mono text-zinc-500">in {unit}</span>}
            </div>

            <div className="w-full overflow-x-auto py-1">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
                    <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Baseline reference */}
                    {baselineY !== null && (
                        <g>
                            <line x1={paddingX} y1={baselineY} x2={width - paddingX} y2={baselineY} stroke="#71717a" strokeDasharray="3 3" strokeWidth="1" opacity="0.4" />
                            <text x={width - paddingX + 2} y={baselineY + 3} fill="#71717a" fontSize="8" fontFamily="monospace">base</text>
                        </g>
                    )}

                    {/* Area fill */}
                    {areaD && <path d={areaD} fill="url(#trendGrad)" />}

                    {/* Line stroke */}
                    {pathD && <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

                    {/* Data Points */}
                    {coords.map((pt, idx) => (
                        <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="3" fill="#09090b" stroke="#22d3ee" strokeWidth="2" />
                            <text x={pt.x} y={height - 2} fill="#a1a1aa" fontSize="9" textAnchor="middle" fontFamily="sans-serif">{pt.label}</text>
                            <text x={pt.x} y={pt.y - 6} fill="#e4e4e7" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">{pt.value}</text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// 3. Comparison Bars Component
// ──────────────────────────────────────────────────────────────

function ComparisonRenderer({ data }: { data: ComparisonData }) {
    if (!data.items || data.items.length === 0) return null;
    const items = data.items;
    const maxVal = Math.max(...items.map(i => i.value), 1);
    const unit = data.unit || items[0]?.unit || "";

    return (
        <div className="my-3.5 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                    <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{data.title || "Comparison"}</span>
                </div>
                {unit && <span className="text-[10px] font-mono text-zinc-500">({unit})</span>}
            </div>

            <div className="space-y-3">
                {items.map((item, idx) => {
                    const color = getSemanticColor(item.label, idx);
                    const pct = Math.min(100, Math.max(0, (item.value / maxVal) * 100));

                    return (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-baseline text-xs">
                                <span className="font-medium text-zinc-300 truncate max-w-[70%]">{item.label}</span>
                                <span className="font-mono font-bold text-white tabular-nums">
                                    {item.value} {unit}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/70">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${color.bg}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            {item.subtext && <span className="text-[10px] text-zinc-500 block">{item.subtext}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// 4. Segmented Distribution Bar Component
// ──────────────────────────────────────────────────────────────

function DistributionRenderer({ data }: { data: DistributionData }) {
    if (!data.segments || data.segments.length === 0) return null;
    const total = data.segments.reduce((sum, s) => sum + (s.value || 0), 0);
    if (total <= 0) return null;

    return (
        <div className="my-3.5 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                    <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">{data.title || "Time Breakdown"}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Total: {total} {data.segments[0]?.unit || ""}</span>
            </div>

            {/* Segmented Stacked Bar */}
            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800/80">
                {data.segments.map((seg, idx) => {
                    const color = getSemanticColor(seg.label, idx);
                    const pct = (seg.value / total) * 100;
                    if (pct <= 0) return null;
                    return (
                        <div
                            key={idx}
                            className={`h-full ${color.bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${pct}%` }}
                            title={`${seg.label}: ${seg.value} (${Math.round(pct)}%)`}
                        />
                    );
                })}
            </div>

            {/* Legend Chips */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-2">
                {data.segments.map((seg, idx) => {
                    const color = getSemanticColor(seg.label, idx);
                    const pct = Math.round((seg.value / total) * 100);
                    return (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                            <span className="text-zinc-400 font-medium">{seg.label}:</span>
                            <span className="font-mono font-bold text-white">{seg.value}</span>
                            <span className="text-[10px] font-mono text-zinc-500">({pct}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────
// Flexible Fallback Key-Value Line Parser
// ──────────────────────────────────────────────────────────────

function parseKeyValueFallback(text: string): VisualizationData | null {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const header = lines[0].toLowerCase();

    const parseLine = (line: string): { label: string; value: string; num: number } | null => {
        // Match "Label: Value" or "Label = Value" or "Label 120 min"
        let label = "";
        let valStr = "";

        if (line.includes(":") || line.includes("=")) {
            const parts = line.split(/[:=]/);
            label = parts[0].trim();
            valStr = parts.slice(1).join(":").trim();
        } else {
            // Split before the first number
            const match = line.match(/^(.+?)\s+(\d+.*)$/);
            if (match) {
                label = match[1].trim();
                valStr = match[2].trim();
            }
        }

        if (!label || !valStr) return null;
        const num = parseFloat(valStr.replace(/[^0-9.]/g, "")) || 0;
        return { label, value: valStr, num };
    };
    
    if (header.includes("metric") || header.includes("grid")) {
        const items: MetricGridItem[] = [];
        for (let i = 1; i < lines.length; i++) {
            const parsed = parseLine(lines[i]);
            if (parsed) {
                items.push({ label: parsed.label, value: parsed.value });
            }
        }
        if (items.length > 0) return { type: "metric-grid", items };
    }
    
    if (header.includes("distribution") || header.includes("breakdown") || header.includes("ratio")) {
        const segments: DistributionSegment[] = [];
        for (let i = 1; i < lines.length; i++) {
            const parsed = parseLine(lines[i]);
            if (parsed && parsed.num > 0) {
                segments.push({ label: parsed.label, value: parsed.num });
            }
        }
        if (segments.length > 0) return { type: "distribution", segments };
    }

    if (header.includes("comparison") || header.includes("compare") || header.includes("goal")) {
        const items: ComparisonItem[] = [];
        for (let i = 1; i < lines.length; i++) {
            const parsed = parseLine(lines[i]);
            if (parsed && parsed.num >= 0) {
                items.push({ label: parsed.label, value: parsed.num });
            }
        }
        if (items.length > 0) return { type: "comparison", items };
    }

    return null;
}

// ──────────────────────────────────────────────────────────────
// Root VisualBlock Component Dispatcher
// ──────────────────────────────────────────────────────────────

export function VisualBlock({ rawJson }: { rawJson: string }) {
    let parsed: VisualizationData | null = null;

    try {
        parsed = JSON.parse(rawJson) as VisualizationData;
    } catch {
        parsed = parseKeyValueFallback(rawJson);
    }

    if (!parsed || typeof parsed !== "object" || !parsed.type) {
        return null; // Silently hide malformed visualization without breaking user's answer
    }

    switch (parsed.type) {
        case "metric-grid":
            return <MetricGridRenderer data={parsed} />;
        case "trend":
            return <TrendChartRenderer data={parsed} />;
        case "comparison":
            return <ComparisonRenderer data={parsed} />;
        case "distribution":
            return <DistributionRenderer data={parsed} />;
        default:
            return null; // Unknown type → silently hide
    }
}
