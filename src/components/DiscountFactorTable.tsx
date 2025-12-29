import { DiscountFactor } from "@/lib/bootstrapping";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiscountFactorTableProps {
  discountFactors: DiscountFactor[];
}

export function DiscountFactorTable({ discountFactors }: DiscountFactorTableProps) {
  if (discountFactors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Pas de données disponibles
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
              Tenor (Y)
            </th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">
              Discount Factor
            </th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">
              Zero Rate (%)
            </th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground">
              Forward Rate (%)
            </th>
          </tr>
        </thead>
        <tbody>
          {discountFactors.map((df, idx) => (
            <tr
              key={idx}
              className="border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <td className="py-2 px-4 font-mono text-foreground">
                {df.tenor.toFixed(2)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-foreground">
                {df.df.toFixed(8)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-foreground">
                {(df.zeroRate * 100).toFixed(4)}%
              </td>
              <td className="py-2 px-4 text-right font-mono text-foreground">
                {df.forwardRate ? `${(df.forwardRate * 100).toFixed(4)}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}
