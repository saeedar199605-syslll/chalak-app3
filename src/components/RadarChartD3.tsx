/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface CompetencyDimensionData {
  key: 'K' | 'Q' | 'B' | 'S' | 'L';
  label: string;
  shortLabel: string;
  actual: number;     // 1 to 5
  target?: number;    // Standard target, defaults to 4 or 5
  self?: number;      // Self-assessment if available
  description?: string;
}

interface RadarChartD3Props {
  data: CompetencyDimensionData[];
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  title?: string;
  showTarget?: boolean;
  showSelf?: boolean;
  interactive?: boolean;
  className?: string;
}

export default function RadarChartD3({
  data,
  width = 380,
  height = 340,
  theme = 'dark',
  title = 'نمودار راداری شایستگی‌های پنج‌گانه',
  showTarget = true,
  showSelf = true,
  interactive = true,
  className = ''
}: RadarChartD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    dimension: CompetencyDimensionData;
    type: 'actual' | 'target' | 'self';
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 50, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;
    const centerX = width / 2;
    const centerY = height / 2 + 5;

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX}, ${centerY})`);

    const numAxes = data.length;
    const angleSlice = (Math.PI * 2) / numAxes;
    const levels = 5;
    const maxValue = 5;
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);

    const isDark = theme === 'dark';
    const gridColor = isDark ? '#334155' : '#cbd5e1';
    const gridLabelColor = isDark ? '#64748b' : '#94a3b8';
    const axisLabelColor = isDark ? '#e2e8f0' : '#1e293b';

    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;

      const levelData: [number, number][] = data.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return [
          levelRadius * Math.cos(angle),
          levelRadius * Math.sin(angle)
        ];
      });

      const lineGenerator = d3.line<[number, number]>().curve(d3.curveLinearClosed);
      g.append('path')
        .attr('d', lineGenerator(levelData) || '')
        .attr('fill', level % 2 === 0 ? (isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)') : 'none')
        .attr('stroke', gridColor)
        .attr('stroke-width', level === levels ? 1.5 : 0.8)
        .attr('stroke-dasharray', level === levels ? 'none' : '2,2');

      g.append('text')
        .attr('x', 4)
        .attr('y', -levelRadius)
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('fill', gridLabelColor)
        .text(level.toString());
    }

    const axis = g.selectAll('.axis')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'axis');

    axis.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (_, i) => radius * Math.cos(i * angleSlice - Math.PI / 2))
      .attr('y2', (_, i) => radius * Math.sin(i * angleSlice - Math.PI / 2))
      .attr('stroke', gridColor)
      .attr('stroke-width', 1);

    axis.append('text')
      .attr('class', 'legend')
      .attr('text-anchor', (_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        if (Math.abs(Math.cos(angle)) < 0.2) return 'middle';
        return Math.cos(angle) > 0 ? 'start' : 'end';
      })
      .attr('dy', (_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        if (Math.sin(angle) < -0.8) return '-0.6em';
        if (Math.sin(angle) > 0.8) return '1.2em';
        return '0.35em';
      })
      .attr('x', (_, i) => (radius + 18) * Math.cos(i * angleSlice - Math.PI / 2))
      .attr('y', (_, i) => (radius + 18) * Math.sin(i * angleSlice - Math.PI / 2))
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', axisLabelColor)
      .text(d => `${d.key}: ${d.shortLabel || d.label}`);

    const radarLine = d3.lineRadial<number>()
      .radius(d => rScale(d))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    if (showTarget) {
      const targetValues = data.map(d => d.target || 4.5);
      g.append('path')
        .datum(targetValues)
        .attr('d', radarLine)
        .attr('fill', 'rgba(148, 163, 184, 0.08)')
        .attr('stroke', isDark ? '#94a3b8' : '#64748b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');
    }

    const hasSelfData = data.some(d => typeof d.self === 'number' && d.self > 0);
    if (showSelf && hasSelfData) {
      const selfValues = data.map(d => d.self || 0);
      g.append('path')
        .datum(selfValues)
        .attr('d', radarLine)
        .attr('fill', 'rgba(59, 130, 246, 0.15)')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2);
    }

    const actualValues = data.map(d => Math.max(0, Math.min(5, d.actual)));
    const actualPath = g.append('path')
      .datum(actualValues)
      .attr('d', radarLine)
      .attr('fill', 'rgba(20, 184, 166, 0.35)')
      .attr('stroke', '#14b8a6')
      .attr('stroke-width', 2.5);

    actualPath.style('filter', 'drop-shadow(0 0 6px rgba(20, 184, 166, 0.4))');

    data.forEach((dim, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const actualVal = Math.max(0, Math.min(5, dim.actual));
      const actualX = rScale(actualVal) * Math.cos(angle);
      const actualY = rScale(actualVal) * Math.sin(angle);

      const circle = g.append('circle')
        .attr('cx', actualX)
        .attr('cy', actualY)
        .attr('r', 5)
        .attr('fill', '#14b8a6')
        .attr('stroke', isDark ? '#0f172a' : '#ffffff')
        .attr('stroke-width', 2)
        .attr('class', 'cursor-pointer transition-all duration-150');

      if (interactive) {
        circle
          .on('mouseenter', (event) => {
            d3.select(event.currentTarget).attr('r', 7).attr('fill', '#2dd4bf');
            setHoveredPoint({
              dimension: dim,
              type: 'actual',
              x: centerX + actualX,
              y: centerY + actualY
            });
          })
          .on('mouseleave', (event) => {
            d3.select(event.currentTarget).attr('r', 5).attr('fill', '#14b8a6');
            setHoveredPoint(null);
          });
      }
    });
  }, [data, width, height, theme, showTarget, showSelf, interactive]);

  const avgScore = data.length > 0 
    ? (data.reduce((acc, curr) => acc + (curr.actual || 0), 0) / data.length).toFixed(2)
    : '0';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`} dir="rtl">
      {title && (
        <div className="w-full flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <h4 className="text-xs font-black tracking-wide text-slate-200">{title}</h4>
          </div>
          <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold text-teal-400">
            <span>میانگین توازن:</span>
            <span className="font-mono text-xs">{avgScore} / ۵</span>
          </div>
        </div>
      )}

      <div className="relative overflow-visible">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        />

        {hoveredPoint && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-slate-900/95 border border-teal-500/50 shadow-2xl rounded-2xl p-2.5 text-right backdrop-blur-md min-w-[150px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: `${hoveredPoint.x}px`,
              top: `${hoveredPoint.y}px`
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-black text-xs text-teal-400">
                [{hoveredPoint.dimension.key}] {hoveredPoint.dimension.label}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-500/20 text-teal-300 rounded-md">
                {hoveredPoint.dimension.actual} از ۵
              </span>
            </div>
            <div className="text-[10px] text-slate-300 space-y-1">
              {hoveredPoint.dimension.self !== undefined && (
                <div className="flex justify-between text-blue-400">
                  <span>خودارزیابی:</span>
                  <span className="font-bold">{hoveredPoint.dimension.self}</span>
                </div>
              )}
              {hoveredPoint.dimension.target !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>هدف استاندارد:</span>
                  <span className="font-bold">{hoveredPoint.dimension.target}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-400 font-semibold pt-0.5 border-t border-slate-800/80">
                <span>انطباق:</span>
                <span>{Math.round((hoveredPoint.dimension.actual / 5) * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[10px] font-semibold text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-sm bg-teal-500" />
          <span>ارزیابی سرپرست (واقعی)</span>
        </div>
        {showSelf && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-blue-500" />
            <span>خودارزیابی کارمند</span>
          </div>
        )}
        {showTarget && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-slate-400" />
            <span>هدف استاندارد (مبنا)</span>
          </div>
        )}
      </div>
    </div>
  );
}
