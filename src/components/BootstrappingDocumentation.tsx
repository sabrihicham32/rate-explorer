import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, TrendingUp, Calculator, Layers } from "lucide-react";

const METHODS_DOCUMENTATION = [
  {
    id: "standard",
    title: "Méthodes Standard",
    icon: Calculator,
    methods: [
      {
        name: "Simple/Linéaire",
        description: "Interpolation linéaire entre les points de données",
        process: [
          "1. Trier tous les points (swaps et futures) par tenor",
          "2. Forcer les swaps comme points de calibration exacts",
          "3. Ajuster les futures entre deux swaps si nécessaire",
          "4. Calculer les taux zéro par interpolation linéaire entre chaque paire de points",
          "5. Calculer DF(t) = exp(-r(t) × t) pour chaque point",
        ],
        pros: ["Simple et rapide", "Pas de risque d'oscillations"],
        cons: ["Courbe non lisse", "Forwards discontinus"],
        formula: "r(t) = r₁ + (r₂ - r₁) × (t - t₁) / (t₂ - t₁)",
      },
      {
        name: "Cubic Spline",
        description: "Interpolation par splines cubiques naturelles pour une courbe lisse",
        process: [
          "1. Préparer les points (swaps prioritaires, futures ajustés)",
          "2. Construire une matrice tridiagonale pour les splines naturelles",
          "3. Résoudre le système pour obtenir les coefficients de chaque segment",
          "4. Interpoler avec continuité C² (dérivées secondes continues)",
          "5. Calculer les discount factors à partir des taux lissés",
        ],
        pros: ["Courbe parfaitement lisse", "Dérivées continues"],
        cons: ["Peut osciller aux extrémités", "Forwards parfois non-monotones"],
        formula: "S(t) = aᵢ + bᵢ(t-tᵢ) + cᵢ(t-tᵢ)² + dᵢ(t-tᵢ)³",
      },
      {
        name: "Nelson-Siegel",
        description: "Modèle paramétrique à 4 paramètres capturant level, slope, curvature",
        process: [
          "1. Définir la fonction NS: r(t) = β₀ + β₁[(1-e^(-t/λ))/(t/λ)] + β₂[(1-e^(-t/λ))/(t/λ) - e^(-t/λ)]",
          "2. Optimiser les 4 paramètres (β₀, β₁, β₂, λ) par moindres carrés pondérés",
          "3. Les swaps reçoivent un poids plus élevé dans l'optimisation",
          "4. Utiliser la descente de gradient pour minimiser l'erreur",
          "5. Générer la courbe complète avec les paramètres optimaux",
        ],
        pros: ["Interprétation économique claire", "Courbe toujours lisse", "Peu de paramètres"],
        cons: ["Flexibilité limitée", "Peut mal fitter les données complexes"],
        formula: "r(τ) = β₀ + β₁(1-e^(-τ/λ))/(τ/λ) + β₂[(1-e^(-τ/λ))/(τ/λ) - e^(-τ/λ)]",
      },
    ],
  },
  {
    id: "bloomberg",
    title: "Méthode Bloomberg",
    icon: TrendingUp,
    methods: [
      {
        name: "Bloomberg (Log-Linear DF + Forward Smoothing)",
        description: "Approche professionnelle: force tous les swaps, utilise les futures comme guides, lisse les forwards",
        process: [
          "1. Bootstrap initial: calculer les DFs à partir des swaps (priorité absolue)",
          "2. Interpoler log(DF) linéairement entre les points swaps",
          "3. Insérer les futures comme guides intermédiaires",
          "4. Appliquer un lissage sur la courbe forward implicite",
          "5. Contrainte de monotonie: forwards ≥ 0 et croissance contrôlée",
          "6. Recalculer les DFs finaux cohérents avec les forwards lissés",
        ],
        pros: [
          "Standard de marché reconnu",
          "Forwards lisses et monotones",
          "Pas d'arbitrage",
          "Stabilité de la courbe",
        ],
        cons: ["Complexe à implémenter", "Peut s'écarter légèrement des futures"],
        formula: "log(DF(t)) = log(DF(t₁)) + [log(DF(t₂)) - log(DF(t₁))] × (t - t₁)/(t₂ - t₁)",
      },
    ],
  },
  {
    id: "quantlib",
    title: "Méthodes QuantLib",
    icon: Layers,
    methods: [
      {
        name: "QuantLib Log-Linear Discount",
        description: "PiecewiseLogLinearDiscount - Interpolation linéaire sur log(DF)",
        process: [
          "1. Bootstrap séquentiel des discount factors à partir des instruments",
          "2. Interpoler linéairement sur log(DF) entre les piliers",
          "3. Garantit des forwards positifs (log-linéarité → forward constant par segment)",
          "4. Méthode rapide et stable",
        ],
        pros: ["Forwards toujours positifs", "Simple et stable", "Standard QuantLib"],
        cons: ["Forwards en escalier (non-lisses)"],
        formula: "log(DF(t)) interpolé linéairement → f(t) = -∂log(DF)/∂t constant par segment",
      },
      {
        name: "QuantLib Log-Cubic Discount",
        description: "PiecewiseLogCubicDiscount - Spline cubique sur log(DF)",
        process: [
          "1. Bootstrap des DFs aux piliers (swaps forcés)",
          "2. Construire une spline cubique sur log(DF)",
          "3. Appliquer des conditions aux bords naturelles",
          "4. Interpoler pour obtenir des forwards lisses",
        ],
        pros: ["Forwards lisses", "Continuité C²"],
        cons: ["Peut produire des forwards négatifs aux extrémités"],
        formula: "log(DF(t)) = spline cubique → forwards = -d/dt[log(DF)] lisses",
      },
      {
        name: "QuantLib Linear Forward",
        description: "PiecewiseLinearForward - Interpolation linéaire sur les taux forward",
        process: [
          "1. Bootstrap des taux forward implicites",
          "2. Interpoler linéairement les forwards entre piliers",
          "3. Intégrer les forwards pour reconstruire les DFs",
          "4. Courbe forward en segments linéaires",
        ],
        pros: ["Forwards prévisibles", "Facile à comprendre"],
        cons: ["Forwards non-lisses aux nœuds"],
        formula: "f(t) interpolé linéairement → DF(t) = exp(-∫₀ᵗ f(s)ds)",
      },
      {
        name: "QuantLib Monotonic Convex",
        description: "Hagan-West Monotonic Convex - Préserve la monotonie des forwards avec convexité",
        process: [
          "1. Bootstrap initial avec contraintes de monotonie",
          "2. Appliquer l'algorithme Hagan-West pour préserver la convexité",
          "3. Ajuster itérativement pour éviter les forwards négatifs",
          "4. Garantir la cohérence avec tous les instruments de calibration",
          "5. Produire une courbe forward monotone et convexe",
        ],
        pros: [
          "Forwards toujours monotones",
          "Pas d'oscillations",
          "Robuste aux données bruitées",
          "Standard professionnel",
        ],
        cons: ["Complexe algorithmiquement", "Plus lent"],
        formula: "Contraintes: f'(t) ≥ 0 (monotonie) + conditions de convexité de Hagan-West",
      },
    ],
  },
];

const GENERAL_CONCEPTS = [
  {
    title: "Discount Factor (DF)",
    description: "Valeur actuelle de 1€ reçu à la date t. DF(t) = exp(-r(t) × t) en composition continue.",
  },
  {
    title: "Taux Zéro",
    description: "Taux actuariel pour un investissement de 0 à t. r(t) = -ln(DF(t))/t",
  },
  {
    title: "Taux Forward",
    description: "Taux implicite entre deux dates futures. f(t₁,t₂) = [r(t₂)×t₂ - r(t₁)×t₁]/(t₂-t₁)",
  },
  {
    title: "Priorité Swaps vs Futures",
    description: "Les swaps sont des points de calibration exacts (forcés). Les futures servent de guides entre les swaps et sont ajustés si incohérents.",
  },
];

export function BootstrappingDocumentation() {
  return (
    <div className="space-y-6">
      {/* General Concepts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Concepts Fondamentaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GENERAL_CONCEPTS.map((concept) => (
              <div key={concept.title} className="p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-sm mb-2">{concept.title}</h4>
                <p className="text-sm text-muted-foreground">{concept.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Methods */}
      {METHODS_DOCUMENTATION.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <category.icon className="w-5 h-5" />
              {category.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {category.methods.map((method, idx) => (
                <AccordionItem key={idx} value={`${category.id}-${idx}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{method.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <p className="text-muted-foreground">{method.description}</p>

                    {/* Process */}
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Processus de calcul:</h5>
                      <ol className="space-y-1">
                        {method.process.map((step, stepIdx) => (
                          <li key={stepIdx} className="text-sm text-muted-foreground pl-2">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Formula */}
                    <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
                      <span className="text-xs text-muted-foreground block mb-1">Formule clé:</span>
                      {method.formula}
                    </div>

                    {/* Pros/Cons */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-semibold text-green-600 mb-2">Avantages</h5>
                        <ul className="space-y-1">
                          {method.pros.map((pro, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                              <span className="text-green-500">✓</span> {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-orange-600 mb-2">Inconvénients</h5>
                        <ul className="space-y-1">
                          {method.cons.map((con, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                              <span className="text-orange-500">−</span> {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Bonnes Pratiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border-l-4 border-blue-500 bg-blue-500/10 rounded-r-lg">
            <h4 className="font-semibold mb-2">Règle d'or</h4>
            <p className="text-sm text-muted-foreground">
              Toujours forcer les swaps comme points de calibration exacts. Les futures servent uniquement 
              de guides entre les swaps et doivent être ajustés si leurs taux implicites créent des 
              incohérences (forwards négatifs, oscillations).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <Badge variant="default" className="mb-2">Production</Badge>
              <p className="text-sm text-muted-foreground">
                Utilisez Bloomberg ou QuantLib Monotonic Convex pour des courbes stables et professionnelles.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge variant="secondary" className="mb-2">Analyse</Badge>
              <p className="text-sm text-muted-foreground">
                Nelson-Siegel pour l'interprétation économique (level, slope, curvature).
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge variant="outline" className="mb-2">Rapidité</Badge>
              <p className="text-sm text-muted-foreground">
                Log-Linear pour des calculs rapides avec garantie de forwards positifs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
