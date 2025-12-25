import { useState } from "react";
import { useRateData } from "@/hooks/useRateData";
import { RATE_INDICES } from "@/lib/rateIndices";
import { DashboardHeader } from "@/components/DashboardHeader";
import { RateCard } from "@/components/RateCard";
import { RateTable } from "@/components/RateTable";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

const Index = () => {
  const [selectedIndex, setSelectedIndex] = useState(RATE_INDICES[0].id);
  const queryClient = useQueryClient();
  
  const { data: rateData, isLoading, isFetching, error } = useRateData(selectedIndex);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["rateData", selectedIndex] });
  };

  const selectedRate = RATE_INDICES.find((r) => r.id === selectedIndex);

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <DashboardHeader
        lastUpdated={rateData?.lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Rate Index Selector */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Select Rate Index
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {RATE_INDICES.map((rate) => (
              <RateCard
                key={rate.id}
                rate={rate}
                isSelected={selectedIndex === rate.id}
                onClick={() => setSelectedIndex(rate.id)}
                isLoading={selectedIndex === rate.id && isFetching}
              />
            ))}
          </div>
        </section>

        {/* Data Table */}
        <section className="bg-card rounded-lg border border-border overflow-hidden shadow-lg">
          <div className="p-4 border-b border-border bg-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedRate?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Futures prices for all maturities
                </p>
              </div>
              {rateData?.data && (
                <span className="text-sm text-muted-foreground">
                  {rateData.data.length} contracts
                </span>
              )}
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 text-destructive/50" />
              <p className="text-lg font-medium">Failed to load data</p>
              <p className="text-sm">{rateData?.error || "Please try again later"}</p>
            </div>
          ) : (
            <RateTable
              data={rateData?.data || []}
              isLoading={isLoading}
            />
          )}
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Data sourced from Barchart. Prices may be delayed.</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
