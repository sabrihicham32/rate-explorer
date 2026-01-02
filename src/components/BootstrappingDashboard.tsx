import { useState, useMemo, useCallback } from "react";
import { useRateData } from "@/hooks/useRateData";
import { useIRSData } from "@/hooks/useIRSData";
import { RATE_INDICES } from "@/lib/rateIndices";
import { IRS_INDICES } from "@/lib/irsIndices";
import { CURRENCY_CONFIGS, CurrencyConfig } from "@/lib/currencyDefaults";
import { getCacheAge, clearAllCache } from "@/lib/dataCache";
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
import { BootstrappingDocumentation } from "./BootstrappingDocumentation";
import { Download, Calculator, TrendingUp, Settings2, RefreshCw, Plus, X, Clock, Layers, BookOpen } from "lucide-react";
import { toast } from "sonner";

const BOOTSTRAP_METHODS: { id: BootstrapMethod; name: string; description: string; category: 'standard' | 'bloomberg' | 'quantlib' }[] = [
  // Standard Methods
  { id: "linear", name: "Simple/Linéaire", description: "Interpolation linéaire entre les points", category: 'standard' },
  { id: "cubic_spline", name: "Cubic Spline", description: "Interpolation par splines cubiques naturelles", category: 'standard' },
  { id: "nelson_siegel", name: "Nelson-Siegel", description: "Modèle paramétrique à 4 paramètres (β₀, β₁, β₂, λ)", category: 'standard' },
  // Bloomberg Method
  { id: "bloomberg", name: "Bloomberg", description: "Log-DF interpolation + forward smoothing + monotonicity", category: 'bloomberg' },
  // QuantLib Methods
  { id: "quantlib_log_linear", name: "QuantLib Log-Linear", description: "PiecewiseLogLinearDiscount - Interpolation linéaire sur log(DF)", category: 'quantlib' },
  { id: "quantlib_log_cubic", name: "QuantLib Log-Cubic", description: "PiecewiseLogCubicDiscount - Spline cubique sur log(DF)", category: 'quantlib' },
  { id: "quantlib_linear_forward", name: "QuantLib Linear Forward", description: "PiecewiseLinearForward - Interpolation linéaire sur forwards", category: 'quantlib' },
  { id: "quantlib_monotonic_convex", name: "QuantLib Monotonic Convex", description: "Hagan-West monotonic convex - Préserve la monotonie des forwards", category: 'quantlib' },
];

interface CurveConfig {
  id: string;
  currency: string;
  futuresIndex: string;
  irsCurrency: string;
  useFutures: boolean;
  useIRS: boolean;
}

function generateCurveId(): string {
  return `curve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultCurveConfig(currencyConfig: CurrencyConfig): CurveConfig {
  return {
    id: generateCurveId(),
    currency: currencyConfig.currency,
    futuresIndex: currencyConfig.defaultFuturesIndex,
    irsCurrency: currencyConfig.defaultIRSCurrency,
    useFutures: true,
    useIRS: true,
  };
}

// Get available futures indices for a currency
function getFuturesIndicesForCurrency(currency: string) {
  return RATE_INDICES.filter(r => r.currency === currency);
}

// Get available IRS indices for a currency (or all if none specific)
function getIRSIndicesForCurrency(currency: string) {
  const specific = IRS_INDICES.filter(i => i.currency === currency);
  return specific.length > 0 ? specific : IRS_INDICES;
}

export function BootstrappingDashboard() {
  // Multi-curve mode
  const [curves, setCurves] = useState<CurveConfig[]>([
    getDefaultCurveConfig(CURRENCY_CONFIGS[0]), // EUR by default
  ]);
  const [comparisonMode, setComparisonMode] = useState(false);

  // Method selection (shared across curves)
  const [selectedMethods, setSelectedMethods] = useState<BootstrapMethod[]>(["linear", "cubic_spline"]);

  // Active curve for single-curve view
  const activeCurve = curves[0];

  // Fetch data for all unique indices used
  const uniqueFuturesIndices = [...new Set(curves.map(c => c.futuresIndex))];
  const uniqueIRSCurrencies = [...new Set(curves.map(c => c.irsCurrency))];

  // Map queries by index for easy lookup
  const futuresQueriesMap = new Map<string, ReturnType<typeof useRateData>>();
  const irsQueriesMap = new Map<string, ReturnType<typeof useIRSData>>();

  // Create queries for each unique index (hooks must be called unconditionally)
  const futuresQuery0 = useRateData(uniqueFuturesIndices[0] || "");
  const futuresQuery1 = useRateData(uniqueFuturesIndices[1] || "");
  const futuresQuery2 = useRateData(uniqueFuturesIndices[2] || "");
  const futuresQuery3 = useRateData(uniqueFuturesIndices[3] || "");
  const futuresQuery4 = useRateData(uniqueFuturesIndices[4] || "");
  
  const irsQuery0 = useIRSData(uniqueIRSCurrencies[0] || "");
  const irsQuery1 = useIRSData(uniqueIRSCurrencies[1] || "");
  const irsQuery2 = useIRSData(uniqueIRSCurrencies[2] || "");
  const irsQuery3 = useIRSData(uniqueIRSCurrencies[3] || "");
  const irsQuery4 = useIRSData(uniqueIRSCurrencies[4] || "");

  // Populate maps
  if (uniqueFuturesIndices[0]) futuresQueriesMap.set(uniqueFuturesIndices[0], futuresQuery0);
  if (uniqueFuturesIndices[1]) futuresQueriesMap.set(uniqueFuturesIndices[1], futuresQuery1);
  if (uniqueFuturesIndices[2]) futuresQueriesMap.set(uniqueFuturesIndices[2], futuresQuery2);
  if (uniqueFuturesIndices[3]) futuresQueriesMap.set(uniqueFuturesIndices[3], futuresQuery3);
  if (uniqueFuturesIndices[4]) futuresQueriesMap.set(uniqueFuturesIndices[4], futuresQuery4);
  
  if (uniqueIRSCurrencies[0]) irsQueriesMap.set(uniqueIRSCurrencies[0], irsQuery0);
  if (uniqueIRSCurrencies[1]) irsQueriesMap.set(uniqueIRSCurrencies[1], irsQuery1);
  if (uniqueIRSCurrencies[2]) irsQueriesMap.set(uniqueIRSCurrencies[2], irsQuery2);
  if (uniqueIRSCurrencies[3]) irsQueriesMap.set(uniqueIRSCurrencies[3], irsQuery3);
  if (uniqueIRSCurrencies[4]) irsQueriesMap.set(uniqueIRSCurrencies[4], irsQuery4);

  // Get query for a specific curve
  const getFuturesQuery = (index: string) => futuresQueriesMap.get(index) || futuresQuery0;
  const getIRSQuery = (currency: string) => irsQueriesMap.get(currency) || irsQuery0;

  // Build results for each curve
  const curveResults = useMemo(() => {
    return curves.map((curve) => {
      const futuresQuery = getFuturesQuery(curve.futuresIndex);
      const irsQuery = getIRSQuery(curve.irsCurrency);
      const futuresData = futuresQuery.data;
      const irsData = irsQuery.data;
      const isLoading = futuresQuery.isLoading || irsQuery.isLoading;

      const swapPoints: BootstrapPoint[] = [];
      const futuresPoints: BootstrapPoint[] = [];

      // Add futures data
      if (curve.useFutures && futuresData?.data) {
        futuresData.data.forEach((item) => {
          const latestPrice = parseFloat(item.latest.replace(/[^0-9.-]/g, ""));
          if (!isNaN(latestPrice)) {
            const tenor = maturityToYears(item.maturity);
            const rate = priceToRate(latestPrice);
            if (tenor > 0 && rate > 0 && rate < 0.5) {
              futuresPoints.push({ 
                tenor, 
                rate, 
                source: "futures",
                priority: 2,
              });
            }
          }
        });
      }

      // Add IRS data
      if (curve.useIRS && irsData?.data) {
        irsData.data.forEach((item) => {
          if (item.rateValue > 0 && item.rateValue < 50) {
            swapPoints.push({
              tenor: item.tenor,
              rate: item.rateValue / 100,
              source: "swap",
              priority: 1,
            });
          }
        });
      }

      const allInputPoints = [...swapPoints, ...futuresPoints].sort((a, b) => a.tenor - b.tenor);

      // Bootstrap
      const results: BootstrapResult[] = 
        swapPoints.length === 0 && futuresPoints.length === 0 
          ? [] 
          : selectedMethods.map((method) => bootstrap(swapPoints, futuresPoints, method, curve.currency));

      return {
        curve,
        swapPoints,
        futuresPoints,
        allInputPoints,
        results,
        isLoading,
        basisConvention: getBasisConvention(curve.currency),
      };
    });
  }, [curves, futuresQueriesMap, irsQueriesMap, selectedMethods]);

  const addCurve = () => {
    // Find a currency not yet used
    const usedCurrencies = new Set(curves.map(c => c.currency));
    const availableCurrency = CURRENCY_CONFIGS.find(cc => !usedCurrencies.has(cc.currency));
    
    if (availableCurrency) {
      setCurves([...curves, getDefaultCurveConfig(availableCurrency)]);
      setComparisonMode(true);
    } else {
      toast.error("Toutes les devises sont déjà ajoutées");
    }
  };

  const removeCurve = (id: string) => {
    if (curves.length > 1) {
      setCurves(curves.filter(c => c.id !== id));
      if (curves.length === 2) {
        setComparisonMode(false);
      }
    }
  };

  const updateCurve = (id: string, updates: Partial<CurveConfig>) => {
    setCurves(curves.map(c => {
      if (c.id !== id) return c;
      
      // If currency changed, update defaults
      if (updates.currency && updates.currency !== c.currency) {
        const config = CURRENCY_CONFIGS.find(cc => cc.currency === updates.currency);
        if (config) {
          return {
            ...c,
            currency: config.currency,
            futuresIndex: config.defaultFuturesIndex,
            irsCurrency: config.defaultIRSCurrency,
          };
        }
      }
      
      return { ...c, ...updates };
    }));
  };

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
    a.download = `discount_factors_${result.method}_${result.currency}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Discount factors exportés en CSV");
  };

  const handleClearCache = () => {
    clearAllCache();
    toast.success("Cache vidé - les données seront rafraîchies");
    // Trigger refresh for all queries
    Array.from(futuresQueriesMap.values()).forEach(q => q.refetch());
    Array.from(irsQueriesMap.values()).forEach(q => q.refetch());
  };

  const isLoading = curveResults.some(r => r.isLoading);
  const activeResult = curveResults[0];

  // Combined results for comparison chart
  const allResultsForComparison = useMemo(() => {
    if (!comparisonMode) return activeResult?.results || [];
    
    // For comparison, take the first method from each curve
    const firstMethod = selectedMethods[0];
    return curveResults
      .map(cr => cr.results.find(r => r.method === firstMethod))
      .filter((r): r is BootstrapResult => !!r);
  }, [comparisonMode, curveResults, selectedMethods, activeResult]);

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configuration du Bootstrapping
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonMode(!comparisonMode)}
              className={comparisonMode ? "bg-primary/10" : ""}
            >
              <Layers className="w-4 h-4 mr-2" />
              {comparisonMode ? "Mode Comparaison" : "Comparer"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Vider Cache
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Currency/Curve Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Courbes de Taux
              </h3>
              {curves.length < CURRENCY_CONFIGS.length && (
                <Button variant="outline" size="sm" onClick={addCurve}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter Courbe
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {curves.map((curve, idx) => {
                const currencyConfig = CURRENCY_CONFIGS.find(c => c.currency === curve.currency);
                const futuresIndex = RATE_INDICES.find(r => r.id === curve.futuresIndex);
                const futuresCacheAge = getCacheAge(curve.futuresIndex, "rates");
                const irsCacheAge = getCacheAge(curve.irsCurrency, "irs");

                return (
                  <div
                    key={curve.id}
                    className="p-4 border rounded-lg bg-card relative"
                  >
                    {curves.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeCurve(curve.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Currency Selector */}
                    <div className="space-y-3">
                      <Select
                        value={curve.currency}
                        onValueChange={(value) => updateCurve(curve.id, { currency: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Devise" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_CONFIGS.map((config) => (
                            <SelectItem 
                              key={config.currency} 
                              value={config.currency}
                              disabled={curves.some(c => c.id !== curve.id && c.currency === config.currency)}
                            >
                              {config.currency} - {config.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {currencyConfig && (
                        <p className="text-xs text-muted-foreground">
                          {currencyConfig.description}
                        </p>
                      )}

                      {/* Data Sources with dropdowns */}
                      <div className="space-y-3 pt-2 border-t">
                        {/* Futures Index Selector */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`futures-${curve.id}`}
                              checked={curve.useFutures}
                              onCheckedChange={(checked) => 
                                updateCurve(curve.id, { useFutures: checked === true })
                              }
                            />
                            <Label htmlFor={`futures-${curve.id}`} className="text-xs text-muted-foreground">Futures</Label>
                          </div>
                          <Select
                            value={curve.futuresIndex}
                            onValueChange={(value) => updateCurve(curve.id, { futuresIndex: value })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RATE_INDICES.map((idx) => (
                                <SelectItem key={idx.id} value={idx.id}>
                                  {idx.name} ({idx.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {futuresCacheAge && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {futuresCacheAge}
                            </span>
                          )}
                        </div>

                        {/* IRS Currency Selector */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`irs-${curve.id}`}
                              checked={curve.useIRS}
                              onCheckedChange={(checked) => 
                                updateCurve(curve.id, { useIRS: checked === true })
                              }
                            />
                            <Label htmlFor={`irs-${curve.id}`} className="text-xs text-muted-foreground">IRS Swaps</Label>
                          </div>
                          <Select
                            value={curve.irsCurrency}
                            onValueChange={(value) => updateCurve(curve.id, { irsCurrency: value })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IRS_INDICES.map((idx) => (
                                <SelectItem key={idx.id} value={idx.id}>
                                  {idx.name} ({idx.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {irsCacheAge && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {irsCacheAge}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="default" className="text-xs">
                          {curveResults[idx]?.swapPoints.length || 0} swaps
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {curveResults[idx]?.futuresPoints.length || 0} futures
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Methods Selection */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Méthodes de Bootstrapping
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Standard Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-primary uppercase">Standard</h4>
                {BOOTSTRAP_METHODS.filter(m => m.category === 'standard').map((method) => (
                  <div key={method.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={method.id}
                      checked={selectedMethods.includes(method.id)}
                      onCheckedChange={() => toggleMethod(method.id)}
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={method.id} className="font-medium text-sm">
                        {method.name}
                      </Label>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {method.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bloomberg Method */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-blue-500 uppercase">Bloomberg</h4>
                {BOOTSTRAP_METHODS.filter(m => m.category === 'bloomberg').map((method) => (
                  <div key={method.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={method.id}
                      checked={selectedMethods.includes(method.id)}
                      onCheckedChange={() => toggleMethod(method.id)}
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={method.id} className="font-medium text-sm">
                        {method.name}
                      </Label>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {method.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* QuantLib Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-green-500 uppercase">QuantLib</h4>
                {BOOTSTRAP_METHODS.filter(m => m.category === 'quantlib').map((method) => (
                  <div key={method.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={method.id}
                      checked={selectedMethods.includes(method.id)}
                      onCheckedChange={() => toggleMethod(method.id)}
                    />
                    <div className="grid gap-0.5">
                      <Label htmlFor={method.id} className="font-medium text-sm">
                        {method.name}
                      </Label>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {method.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Convention Display (for active curve) */}
          {activeResult && (
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Convention ({activeCurve.currency}):</span>
                <Badge variant="outline">{activeResult.basisConvention.dayCount}</Badge>
                <Badge variant="outline">{activeResult.basisConvention.compounding}</Badge>
                <Badge variant="outline">{activeResult.basisConvention.paymentFrequency}x/an</Badge>
              </div>
            </div>
          )}
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
      ) : activeResult && activeResult.allInputPoints.length < 2 ? (
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
            {comparisonMode && <TabsTrigger value="comparison">Comparaison</TabsTrigger>}
            <TabsTrigger value="discount_factors">Discount Factors</TabsTrigger>
            <TabsTrigger value="input_data">Données d'entrée</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>
                  Courbes de Taux Bootstrappées ({activeCurve.currency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BootstrapCurveChart
                  results={activeResult?.results || []}
                  inputPoints={activeResult?.allInputPoints || []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {comparisonMode && (
            <TabsContent value="comparison">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Comparaison Multi-Devises ({selectedMethods[0] ? BOOTSTRAP_METHODS.find(m => m.id === selectedMethods[0])?.name : ''})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {curveResults.map((cr, idx) => (
                      <div key={cr.curve.id}>
                        <BootstrapCurveChart
                          results={cr.results.filter(r => r.method === selectedMethods[0])}
                          inputPoints={cr.allInputPoints}
                          title={`${cr.curve.currency} - ${CURRENCY_CONFIGS.find(c => c.currency === cr.curve.currency)?.description}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="discount_factors" className="space-y-4">
            {(comparisonMode ? curveResults.flatMap(cr => cr.results) : activeResult?.results || []).map((result, idx) => (
              <Card key={`${result.method}-${result.currency}-${idx}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {BOOTSTRAP_METHODS.find((m) => m.id === result.method)?.name}
                      <Badge variant="outline" className="ml-2">{result.currency}</Badge>
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
            {(comparisonMode ? curveResults : [activeResult]).filter(Boolean).map((cr, idx) => (
              <Card key={cr!.curve.id} className={idx > 0 ? "mt-4" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Points de Données d'Entrée
                    {comparisonMode && <Badge variant="outline">{cr!.curve.currency}</Badge>}
                  </CardTitle>
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
                        {cr!.allInputPoints.map((point, pidx) => (
                          <tr key={pidx} className="border-b border-border/50 hover:bg-muted/50">
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
            ))}
          </TabsContent>

          <TabsContent value="documentation">
            <BootstrappingDocumentation />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
