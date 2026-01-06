import React from 'react';

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  height = 200, 
  showValues = false,
  valueFormatter = (v) => v.toString()
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No data to display
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 8, right: 2, bottom: 18, left: 8 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = 100 - padding.left - padding.right; // percentage
  const barWidth = chartWidth / data.length;
  const barSpacing = barWidth * 0.08;
  const actualBarWidth = barWidth - barSpacing;

  return (
    <div className="w-full overflow-x-auto">
      <svg 
        viewBox={`0 0 100 ${height}`} 
        className="w-full"
        style={{ minWidth: `${Math.max(data.length * 50, 300)}px` }}
      >
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#cbd5e1"
          strokeWidth="0.2"
        />
        
        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={100 - padding.right}
          y2={height - padding.bottom}
          stroke="#cbd5e1"
          strokeWidth="0.2"
        />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
          const value = Math.round(maxValue * percent);
          const y = height - padding.bottom - (chartHeight * percent);
          return (
            <g key={percent}>
              <line
                x1={padding.left}
                y1={y}
                x2={100 - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="0.1"
                strokeDasharray="1,1"
              />
              <text
                x={padding.left - 2}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[2.5px] fill-slate-500"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = padding.left + (index * barWidth) + (barSpacing / 2);
          const y = height - padding.bottom - barHeight;
          const color = item.color || '#6366f1';

          return (
            <g key={index}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={actualBarWidth}
                height={barHeight}
                fill={color}
                className="transition-all duration-300 hover:opacity-80"
                rx="0.5"
              />
              
              {/* Value label on top of bar */}
              {showValues && item.value > 0 && (
                <text
                  x={x + actualBarWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  className="text-[2.5px] fill-slate-700 font-semibold"
                >
                  {valueFormatter(item.value)}
                </text>
              )}

              {/* X-axis label */}
              <text
                x={x + actualBarWidth / 2}
                y={height - padding.bottom + 4}
                textAnchor="middle"
                className="text-[2.5px] fill-slate-600"
              >
                {item.label.length > 10 ? item.label.slice(0, 8) + '...' : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

