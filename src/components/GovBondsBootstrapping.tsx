import { useState, useMemo, useEffect } from "react";
import { useCountriesBonds, useCountryYields } from "@/hooks/useBondsData";
import { CountryBondData, BondYieldData } from "@/lib/api/bonds";
import {
  bootstrapBonds,
  BootstrapPoint,
  BootstrapMethod,
  BootstrapResult,
  getBasisConvention,
  exportToCSV,
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
import { Download, Calculator, TrendingUp, RefreshCw, Landmark } from "lucide-react";
import { toast } from "sonner";

const BOOTSTRAP_METHODS: { id: BootstrapMethod; name: string; description: string }[] = [
  { id: "linear", name: "Simple/Linéaire", description: "Interpolation linéaire" },
  { id: "cubic_spline", name: "Cubic Spline", description: "Splines cubiques naturelles" },
  { id: "nelson_siegel", name: "Nelson-Siegel", description: "Modèle paramétrique" },
  { id: "bloomberg", name: "Bloomberg", description: "Log-DF interpolation" },
  { id: "quantlib_log_linear", name: "QL Log-Linear", description: "Log(DF) linéaire" },
  { id: "quantlib_log_cubic", name: "QL Log-Cubic", description: "Log(DF) cubique" },
];

export function GovBondsBootstrapping() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedMethods, setSelectedMethods] = useState<BootstrapMethod[]>(["linear", "cubic_spline"]);
  
  const countriesQuery = useCountriesBonds();
  const yieldsQuery = useCountryYields(selectedCountry);
  
  // Auto-fetch countries on mount
  useEffect(() => {
    if (!countriesQuery.data && !countriesQuery.isFetching) {
      countriesQuery.refetch();
    }
  }, []);
  
  // Get country info
  const countriesData = countriesQuery.data?.data || [];
  const selectedCountryData = countriesData.find(c => c.countrySlug === selectedCountry);
  const currency = selectedCountryData?.currency || "USD";
  const yieldsData = yieldsQuery.data?.data || [];
  
  // Build bootstrap points from bond yields
  const bondPoints: BootstrapPoint[] = useMemo(() => {
    if (!yieldsData.length) return [];
    
    return yieldsData
      .filter(y => y.yield !== null && y.maturityYears > 0)
      .map(y => ({
        tenor: y.maturityYears,
        rate: (y.yield as number) / 100, // Convert from percentage
        source: 'bond' as const,
        priority: 1,
      }));
  }, [yieldsData]);
  
  // Bootstrap results
  const results: BootstrapResult[] = useMemo(() => {
    if (bondPoints.length < 2) return [];
    
    return selectedMethods.map(method => 
      bootstrapBonds(bondPoints, method, currency)
    );
  }, [bondPoints, selectedMethods, currency]);
  
  const basisConvention = getBasisConvention(currency);
  
  const toggleMethod = (method: BootstrapMethod) => {
    setSelectedMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };
  
  const handleExportCSV = (result: BootstrapResult) => {
    const csv = exportToCSV(result);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gov_bonds_${selectedCountry}_${result.method}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Discount factors exportés");
  };
  
  const handleRefresh = () => {
    countriesQuery.refetch();
    if (selectedCountry) {
      yieldsQuery.refetch();
    }
  };
  
  const isLoading = countriesQuery.isLoading || yieldsQuery.isLoading;
  
  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Bootstrapping - Obligations Gouvernementales
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Country Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sélection du Pays
            </Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choisir un pays..." />
              </SelectTrigger>
              <SelectContent>
                {countriesData.map((country) => (
                  <SelectItem key={country.countrySlug} value={country.countrySlug}>
                    <div className="flex items-center gap-2">
                      <span>{country.country}</span>
                      <Badge variant="outline" className="text-xs">
                        {country.currency}
                      </Badge>
                      {country.rating && (
                        <Badge variant="secondary" className="text-xs">
                          {country.rating}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedCountryData && (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="default">{selectedCountryData.currency}</Badge>
                {selectedCountryData.rating && (
                  <Badge variant="outline">Rating: {selectedCountryData.rating}</Badge>
                )}
                {selectedCountryData.yield10Y !== null && (
                  <Badge variant="secondary">10Y: {selectedCountryData.yield10Y.toFixed(2)}%</Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Methods */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Méthodes d'Interpolation
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BOOTSTRAP_METHODS.map((method) => (
                <div key={method.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`bond-${method.id}`}
                    checked={selectedMethods.includes(method.id)}
                    onCheckedChange={() => toggleMethod(method.id)}
                  />
                  <div className="grid gap-0.5">
                    <Label htmlFor={`bond-${method.id}`} className="font-medium text-sm">
                      {method.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary */}
          {selectedCountry && (
            <div className="flex flex-wrap gap-4 pt-4 border-t text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Points de courbe:</span>
                <Badge variant="default">{bondPoints.length} maturités</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Convention ({currency}):</span>
                <Badge variant="outline">{basisConvention.dayCount}</Badge>
                <Badge variant="outline">{basisConvention.compounding}</Badge>
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
      ) : !selectedCountry ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Sélectionnez un pays pour construire sa courbe de rendement
            </p>
          </CardContent>
        </Card>
      ) : bondPoints.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Pas assez de données pour ce pays
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chart">Courbe de Rendement</TabsTrigger>
            <TabsTrigger value="discount_factors">Discount Factors</TabsTrigger>
            <TabsTrigger value="input_data">Données Brutes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle>
                  Courbe de Rendement - {selectedCountryData?.country} ({currency})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BootstrapCurveChart
                  results={results}
                  inputPoints={bondPoints}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="discount_factors">
            <div className="space-y-6">
              {results.map((result) => (
                <Card key={result.method}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {result.method.replace(/_/g, ' ')}
                    </CardTitle>
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
            </div>
          </TabsContent>
          
          <TabsContent value="input_data">
            <Card>
              <CardHeader>
                <CardTitle>Yields des Obligations - {selectedCountryData?.country}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Maturité</th>
                        <th className="text-right p-2">Années</th>
                        <th className="text-right p-2">Yield (%)</th>
                        <th className="text-right p-2">Chg 1M (bp)</th>
                        <th className="text-right p-2">Chg 6M (bp)</th>
                        <th className="text-right p-2">Chg 12M (bp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yieldsData.map((y, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{y.maturity}</td>
                          <td className="p-2 text-right">{y.maturityYears.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono">
                            {y.yield !== null ? y.yield.toFixed(3) : '-'}%
                          </td>
                          <td className={`p-2 text-right ${y.chg1M !== null ? (y.chg1M > 0 ? 'text-red-500' : 'text-green-500') : ''}`}>
                            {y.chg1M !== null ? (y.chg1M > 0 ? '+' : '') + y.chg1M.toFixed(1) : '-'}
                          </td>
                          <td className={`p-2 text-right ${y.chg6M !== null ? (y.chg6M > 0 ? 'text-red-500' : 'text-green-500') : ''}`}>
                            {y.chg6M !== null ? (y.chg6M > 0 ? '+' : '') + y.chg6M.toFixed(1) : '-'}
                          </td>
                          <td className={`p-2 text-right ${y.chg12M !== null ? (y.chg12M > 0 ? 'text-red-500' : 'text-green-500') : ''}`}>
                            {y.chg12M !== null ? (y.chg12M > 0 ? '+' : '') + y.chg12M.toFixed(1) : '-'}
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
