import { useState, useMemo } from "react";
import { useRateData } from "@/hooks/useRateData";
import { useIRSData } from "@/hooks/useIRSData";
import { RATE_INDICES } from "@/lib/rateIndices";
import { IRS_INDICES } from "@/lib/irsIndices";
import {
  bootstrap,
  BootstrapPoint,
  BootstrapMethod,
  BootstrapResult,
  maturityToYears,
  priceToRate,
  exportToCSV,
  getBasisConvention,
} from "@/lib/bootstrapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DiscountFactorTable } from "./DiscountFactorTable";
import { BootstrapCurveChart } from "./BootstrapCurveChart";
import { Download, Calculator, TrendingUp, Settings2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BOOTSTRAP_METHODS: { id: BootstrapMethod; name: string; description: string }[] = [
  { id: "linear", name: "Simple/Linéaire", description: "Interpolation linéaire entre les points" },
  { id: "cubic_spline", name: "Cubic Spline", description: "Interpolation par splines cubiques" },
  { id: "nelson_siegel", name: "Nelson-Siegel", description: "Modèle paramétrique à 4 paramètres" },
];

export function BootstrappingDashboard() {
  // Data source selection
  const [selectedFuturesIndex, setSelectedFuturesIndex] = useState(RATE_INDICES[0].id);
  const [selectedIRSCurrency, setSelectedIRSCurrency] = useState(IRS_INDICES[0].id);
  const [useFutures, setUseFutures] = useState(true);
  const [useIRS, setUseIRS] = useState(true);

  // Method selection
  const [selectedMethods, setSelectedMethods] = useState<BootstrapMethod[]>(["linear", "cubic_spline"]);

  // Fetch data
  const { data: futuresData, isLoading: futuresLoading } = useRateData(selectedFuturesIndex);
  const { data: irsData, isLoading: irsLoading } = useIRSData(selectedIRSCurrency);

  // Get currency from selected sources
  const selectedFutures = RATE_INDICES.find((r) => r.id === selectedFuturesIndex);
  const selectedIRS = IRS_INDICES.find((r) => r.id === selectedIRSCurrency);
  
  // Determine currency (prefer IRS currency if both selected)
  const currency = useIRS && selectedIRS 
    ? selectedIRS.currency 
    : (useFutures && selectedFutures ? selectedFutures.currency : 'USD');

  const basisConvention = getBasisConvention(currency);

  // Separate swap and futures points
  const { swapPoints, futuresPoints } = useMemo(() => {
    const swaps: BootstrapPoint[] = [];
    const futures: BootstrapPoint[] = [];

    // Add futures data (short end)
    if (useFutures && futuresData?.data) {
      futuresData.data.forEach((item) => {
        const latestPrice = parseFloat(item.latest.replace(/[^0-9.-]/g, ""));
        if (!isNaN(latestPrice)) {
          const tenor = maturityToYears(item.maturity);
          const rate = priceToRate(latestPrice);
          if (tenor > 0 && rate > 0 && rate < 0.5) { // Filter unrealistic rates
            futures.push({ 
              tenor, 
              rate, 
              source: "futures",
              priority: 2,
            });
          }
        }
      });
    }

    // Add IRS data (exact calibration points)
    if (useIRS && irsData?.data) {
      irsData.data.forEach((item) => {
        if (item.rateValue > 0 && item.rateValue < 50) { // Filter unrealistic rates
          swaps.push({
            tenor: item.tenor,
            rate: item.rateValue / 100, // Convert from percentage
            source: "swap",
            priority: 1,
          });
        }
      });
    }

    return { swapPoints: swaps, futuresPoints: futures };
  }, [useFutures, useIRS, futuresData, irsData]);

  // Combined points for display
  const allInputPoints = useMemo(() => {
    return [...swapPoints, ...futuresPoints].sort((a, b) => a.tenor - b.tenor);
  }, [swapPoints, futuresPoints]);

  // Run bootstrapping for selected methods
  const bootstrapResults = useMemo((): BootstrapResult[] => {
    if (swapPoints.length === 0 && futuresPoints.length === 0) return [];
    return selectedMethods.map((method) => 
      bootstrap(swapPoints, futuresPoints, method, currency)
    );
  }, [swapPoints, futuresPoints, selectedMethods, currency]);

  const toggleMethod = (method: BootstrapMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const handleExportCSV = (result: BootstrapResult) => {
    const csv = exportToCSV(result);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discount_factors_${result.method}_${currency}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Discount factors exportés en CSV");
  };

  const isLoading = futuresLoading || irsLoading;

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configuration du Bootstrapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Data Sources */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Sources de données
              </h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useFutures"
                  checked={useFutures}
                  onCheckedChange={(checked) => setUseFutures(checked === true)}
                />
                <Label htmlFor="useFutures" className="flex items-center gap-1">
                  Rate Futures (Guides)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Les futures sont utilisés comme guides entre les swaps.
                          Ils sont ajustés pour éviter l'arbitrage.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>

              {useFutures && (
                <Select value={selectedFuturesIndex} onValueChange={setSelectedFuturesIndex}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner l'indice" />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_INDICES.map((index) => (
                      <SelectItem key={index.id} value={index.id}>
                        {index.name} ({index.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useIRS"
                  checked={useIRS}
                  onCheckedChange={(checked) => setUseIRS(checked === true)}
                />
                <Label htmlFor="useIRS" className="flex items-center gap-1">
                  IRS Swaps (Calibration)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Les swaps sont les points de calibration exacts.
                          Ils sont toujours forcés dans la courbe.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>

              {useIRS && (
                <Select value={selectedIRSCurrency} onValueChange={setSelectedIRSCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner la devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {IRS_INDICES.map((index) => (
                      <SelectItem key={index.id} value={index.id}>
                        {index.name} ({index.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Methods */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Méthodes
              </h3>

              {BOOTSTRAP_METHODS.map((method) => (
                <div key={method.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={method.id}
                    checked={selectedMethods.includes(method.id)}
                    onCheckedChange={() => toggleMethod(method.id)}
                  />
                  <div className="grid gap-1">
                    <Label htmlFor={method.id} className="font-medium">
                      {method.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Basis Convention */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Convention ({currency})
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Day Count:</span>
                  <Badge variant="outline">{basisConvention.dayCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Compounding:</span>
                  <Badge variant="outline">{basisConvention.compounding}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fréquence:</span>
                  <Badge variant="outline">{basisConvention.paymentFrequency}x/an</Badge>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Résumé
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Swaps (calibration):</span>
                  <Badge variant="default">{swapPoints.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Futures (guides):</span>
                  <Badge variant="secondary">{futuresPoints.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Méthodes:</span>
                  <span className="font-medium">{selectedMethods.length}</span>
                </div>
              </div>

              {allInputPoints.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Maturités: {allInputPoints[0]?.tenor.toFixed(2)}Y → {allInputPoints[allInputPoints.length - 1]?.tenor.toFixed(2)}Y
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
      ) : allInputPoints.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Sélectionnez au moins une source de données pour effectuer le bootstrapping
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Courbes</TabsTrigger>
            <TabsTrigger value="discount_factors">Discount Factors</TabsTrigger>
            <TabsTrigger value="input_data">Données d'entrée</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>Courbes de Taux Bootstrappées ({currency})</CardTitle>
              </CardHeader>
              <CardContent>
                <BootstrapCurveChart
                  results={bootstrapResults}
                  inputPoints={allInputPoints}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discount_factors" className="space-y-4">
            {bootstrapResults.map((result) => (
              <Card key={result.method}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {BOOTSTRAP_METHODS.find((m) => m.id === result.method)?.name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({result.basisConvention.dayCount}, {result.basisConvention.compounding})
                      </span>
                    </CardTitle>
                    {result.parameters && (
                      <p className="text-xs text-muted-foreground mt-1">
                        β₀={result.parameters.beta0.toFixed(4)}, 
                        β₁={result.parameters.beta1.toFixed(4)}, 
                        β₂={result.parameters.beta2.toFixed(4)}, 
                        λ={result.parameters.lambda.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCSV(result)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <DiscountFactorTable discountFactors={result.discountFactors} />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="input_data">
            <Card>
              <CardHeader>
                <CardTitle>Points de Données d'Entrée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Swaps</strong> = Points de calibration exacts (forcés) | 
                    <strong> Futures</strong> = Guides entre swaps (ajustés si nécessaire)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">Tenor (Y)</th>
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">Taux (%)</th>
                        <th className="py-3 px-4 text-center font-medium text-muted-foreground">Source</th>
                        <th className="py-3 px-4 text-center font-medium text-muted-foreground">Priorité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allInputPoints.map((point, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 px-4 font-mono">{point.tenor.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right font-mono">{(point.rate * 100).toFixed(4)}%</td>
                          <td className="py-2 px-4 text-center">
                            <Badge 
                              variant={point.source === "swap" ? "default" : "secondary"}
                              className={point.adjusted ? "opacity-70" : ""}
                            >
                              {point.source === "swap" ? "Swap" : "Futures"}
                              {point.adjusted && " (adj)"}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className={point.priority === 1 ? "font-bold text-primary" : "text-muted-foreground"}>
                              {point.priority === 1 ? "Calibration" : "Guide"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
