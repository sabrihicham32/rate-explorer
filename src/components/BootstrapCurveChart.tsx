import { useMemo } from "react";
import { BootstrapResult, BootstrapPoint } from "@/lib/bootstrapping";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
  Legend,
} from "recharts";

interface BootstrapCurveChartProps {
  results: BootstrapResult[];
  inputPoints: BootstrapPoint[];
}

const METHOD_COLORS: Record<string, string> = {
  linear: "hsl(var(--primary))",
  cubic_spline: "hsl(142, 76%, 36%)",
  nelson_siegel: "hsl(280, 70%, 50%)",
};

const METHOD_NAMES: Record<string, string> = {
  linear: "Linéaire",
  cubic_spline: "Cubic Spline",
  nelson_siegel: "Nelson-Siegel",
};

export function BootstrapCurveChart({ results, inputPoints }: BootstrapCurveChartProps) {
  const chartData = useMemo(() => {
    if (results.length === 0) return [];

    // Get all unique tenors from all results
    const allTenors = new Set<number>();
    results.forEach((r) => r.curvePoints.forEach((p) => allTenors.add(p.tenor)));
    inputPoints.forEach((p) => allTenors.add(p.tenor));

    const sortedTenors = Array.from(allTenors).sort((a, b) => a - b);

    return sortedTenors.map((tenor) => {
      const point: Record<string, number | string | undefined> = { tenor };

      // Add each method's rate
      results.forEach((result) => {
        const curvePoint = result.curvePoints.find(
          (p) => Math.abs(p.tenor - tenor) < 0.01
        );
        if (curvePoint) {
          point[result.method] = curvePoint.rate * 100; // Convert to percentage
        }
      });

      // Add input points - separate swaps and futures
      const inputPoint = inputPoints.find(
        (p) => Math.abs(p.tenor - tenor) < 0.01
      );
      if (inputPoint) {
        if (inputPoint.source === 'swap') {
          point.swapInput = inputPoint.rate * 100;
        } else {
          point.futuresInput = inputPoint.rate * 100;
        }
        point.source = inputPoint.source;
      }

      return point;
    });
  }, [results, inputPoints]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    results.forEach((result) => {
      config[result.method] = {
        label: METHOD_NAMES[result.method] || result.method,
        color: METHOD_COLORS[result.method] || "hsl(var(--primary))",
      };
    });
    config.swapInput = {
      label: "Swaps (Calibration)",
      color: "hsl(142, 76%, 36%)",
    };
    config.futuresInput = {
      label: "Futures (Guides)",
      color: "hsl(var(--primary))",
    };
    return config;
  }, [results]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Pas de données disponibles
      </div>
    );
  }

  // Calculate Y-axis domain
  const allRates = chartData.flatMap((d) =>
    Object.entries(d)
      .filter(([key]) => key !== "tenor" && key !== "source")
      .map(([, value]) => (typeof value === "number" ? value : 0))
  );
  const minRate = Math.floor(Math.min(...allRates) * 10) / 10 - 0.2;
  const maxRate = Math.ceil(Math.max(...allRates) * 10) / 10 + 0.2;

  return (
    <div className="space-y-4">
      {/* Legend for input points */}
      <div className="flex gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[hsl(142,76%,36%)] rounded-sm" />
          <span className="text-muted-foreground">Swaps (Calibration exacte)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Futures (Guides ajustés)</span>
        </div>
      </div>
      
      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.5}
            />
            <XAxis
              dataKey="tenor"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `${value}Y`}
              label={{
                value: "Maturité (années)",
                position: "insideBottom",
                offset: -10,
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
              }}
            />
            <YAxis
              domain={[minRate, maxRate]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
              label={{
                value: "Taux (%)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const displayName = name === 'swapInput' 
                      ? 'Swap' 
                      : name === 'futuresInput' 
                        ? 'Futures'
                        : METHOD_NAMES[name as string] || name;
                    return [`${Number(value).toFixed(4)}%`, displayName];
                  }}
                  labelFormatter={(label) => `Tenor: ${label}Y`}
                />
              }
            />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => {
                if (value === 'swapInput') return 'Swaps';
                if (value === 'futuresInput') return 'Futures';
                return METHOD_NAMES[value] || value;
              }}
            />

            {/* Render lines for each method */}
            {results.map((result) => (
              <Line
                key={result.method}
                type="monotone"
                dataKey={result.method}
                stroke={METHOD_COLORS[result.method]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}

            {/* Scatter for swap input points (squares) */}
            <Scatter
              name="swapInput"
              dataKey="swapInput"
              fill="hsl(142, 76%, 36%)"
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.swapInput === undefined) return null;
                return (
                  <rect 
                    x={cx - 5} 
                    y={cy - 5} 
                    width={10} 
                    height={10} 
                    fill="hsl(142, 76%, 36%)" 
                    stroke="hsl(var(--background))" 
                    strokeWidth={2} 
                  />
                );
              }}
            />

            {/* Scatter for futures input points (circles) */}
            <Scatter
              name="futuresInput"
              dataKey="futuresInput"
              fill="hsl(var(--primary))"
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.futuresInput === undefined) return null;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={5} 
                    fill="hsl(var(--primary))" 
                    stroke="hsl(var(--background))" 
                    strokeWidth={2} 
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
