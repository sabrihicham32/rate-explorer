import { cn } from "@/lib/utils";
import { FuturesData } from "@/lib/rateIndices";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

interface RateTableProps {
  data: FuturesData[];
  isLoading?: boolean;
}

export function RateTable({ data, isLoading }: RateTableProps) {
  if (isLoading) {
    return <RateTableSkeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contract
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Latest
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Change
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
              Open
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              High
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
              Low
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
              Previous
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.contract}
              className={cn(
                "border-b border-border/50 transition-colors hover:bg-secondary/50",
                index % 2 === 0 ? "bg-transparent" : "bg-secondary/20"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <td className="py-3 px-4">
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-medium text-primary">
                    {row.contract}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.maturity}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm tabular-nums font-medium">
                {row.latest}
              </td>
              <td className="py-3 px-4 text-right">
                <ChangeCell value={row.changeValue} display={row.change} />
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-muted-foreground hidden sm:table-cell">
                {row.open}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-muted-foreground hidden md:table-cell">
                {row.high}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-muted-foreground hidden md:table-cell">
                {row.low}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm tabular-nums text-muted-foreground hidden lg:table-cell">
                {row.previous}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeCell({ value, display }: { value: number; display: string }) {
  const isUnchanged = display.toLowerCase() === "unch" || value === 0;
  const isPositive = value > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-mono text-sm tabular-nums",
        isUnchanged && "text-muted-foreground",
        !isUnchanged && isPositive && "text-green-400",
        !isUnchanged && !isPositive && "text-red-400"
      )}
    >
      {isUnchanged ? (
        <MinusIcon className="w-3 h-3" />
      ) : isPositive ? (
        <ArrowUpIcon className="w-3 h-3" />
      ) : (
        <ArrowDownIcon className="w-3 h-3" />
      )}
      <span>{isUnchanged ? "unch" : (isPositive ? "+" : "") + display}</span>
    </div>
  );
}

function RateTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["Contract", "Latest", "Change", "Open", "High", "Low", "Previous"].map((header) => (
              <th key={header} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-border/50">
              {Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="py-3 px-4">
                  <div className="h-4 bg-secondary/50 rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
