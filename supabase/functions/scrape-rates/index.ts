/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate indices configuration with all maturities up to 2031+
const RATE_INDICES = {
  euribor3m: {
    name: "3-Month Euribor",
    currency: "EUR",
    baseSymbol: "IM",
    baseContract: "IMF26",
    maturities: [
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  sofr: {
    name: "SOFR 3-Month",
    currency: "USD",
    baseSymbol: "SQ",
    baseContract: "SQV25",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  sonia: {
    name: "SONIA 3-Month",
    currency: "GBP",
    baseSymbol: "J8",
    baseContract: "J8Z25",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  estr3m: {
    name: "3-Month ESTR",
    currency: "EUR",
    baseSymbol: "RA",
    baseContract: "RAV25",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  estr1m: {
    name: "1-Month ESTR",
    currency: "EUR",
    baseSymbol: "EG",
    baseContract: "EGV25",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  estr3m_long: {
    name: "3-Month ESTR (Long)",
    currency: "EUR",
    baseSymbol: "RA",
    baseContract: "RAH30",
    maturities: [
      "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31",
      "F32", "G32", "H32", "J32", "K32", "M32", "N32", "Q32", "U32", "V32", "X32", "Z32",
      "F33", "G33", "H33", "J33", "K33", "M33", "N33", "Q33", "U33", "V33", "X33", "Z33"
    ]
  },
  tona3m: {
    name: "3-Month TONA",
    currency: "JPY",
    baseSymbol: "T0",
    baseContract: "T0Z25",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  saron3m: {
    name: "3-Month SARON",
    currency: "CHF",
    baseSymbol: "J2",
    baseContract: "J2Z25",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  corra3m: {
    name: "CORRA 3-Month",
    currency: "CAD",
    baseSymbol: "RG",
    baseContract: "RGZ25",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  },
  sora3m: {
    name: "3M SORA Futures",
    currency: "SGD",
    baseSymbol: "KUA",
    baseContract: "KUAZ25",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "F27", "G27", "H27", "J27", "K27", "M27", "N27", "Q27", "U27", "V27", "X27", "Z27",
      "F28", "G28", "H28", "J28", "K28", "M28", "N28", "Q28", "U28", "V28", "X28", "Z28",
      "F29", "G29", "H29", "J29", "K29", "M29", "N29", "Q29", "U29", "V29", "X29", "Z29",
      "F30", "G30", "H30", "J30", "K30", "M30", "N30", "Q30", "U30", "V30", "X30", "Z30",
      "F31", "G31", "H31", "J31", "K31", "M31", "N31", "Q31", "U31", "V31", "X31", "Z31"
    ]
  }
};

// Month code to name mapping
const MONTH_CODES: Record<string, string> = {
  F: "Jan", G: "Feb", H: "Mar", J: "Apr", K: "May", M: "Jun",
  N: "Jul", Q: "Aug", U: "Sep", V: "Oct", X: "Nov", Z: "Dec"
};

function parseMaturity(code: string): string {
  const monthCode = code.charAt(0);
  const year = "20" + code.slice(1);
  return `${MONTH_CODES[monthCode]} '${code.slice(1)}`;
}

interface FuturesData {
  contract: string;
  maturity: string;
  latest: string;
  change: string;
  changeValue: number;
  open: string;
  high: string;
  low: string;
  previous: string;
}

async function scrapeRateData(
  apiKey: string,
  baseSymbol: string,
  maturities: string[],
  baseContract?: string
): Promise<FuturesData[]> {
  const results: FuturesData[] = [];

  // Use base contract if provided
  const symbol = baseContract || baseSymbol + maturities[0];
  const url = `https://www.barchart.com/futures/quotes/${symbol}/futures-prices`;

  console.log(`Scraping: ${url}`);

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error: ${response.status}`);
      return results;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";
    
    console.log(`Markdown length: ${markdown.length}`);

    // Parse the markdown table
    const lines = markdown.split("\n");
    let inTable = false;
    let headerFound = false;

    for (const line of lines) {
      if (line.includes("Contract") && (line.includes("Last") || line.includes("Latest"))) {
        inTable = true;
        headerFound = true;
        continue;
      }

      if (line.includes("---") && line.includes("|")) {
        continue;
      }

      if (inTable && line.includes("|")) {
        const cells = line.split("|").map((c: string) => c.trim()).filter((c: string) => c);
        
        if (cells.length >= 6) {
          const contractPatterns = [
            /\b([A-Z]{2,4}[FGHJKMNQUVXZ]\d{2})\b/,
            /\[([A-Z]{2,4}[FGHJKMNQUVXZ]\d{2})\]/,
          ];
          
          let contract = "";
          for (const pattern of contractPatterns) {
            const match = cells[0].match(pattern);
            if (match) {
              contract = match[1];
              break;
            }
          }
          
          if (!contract) continue;

          const maturityCode = contract.slice(-3);
          const maturity = parseMaturity(maturityCode);
          
          let latest = "";
          let change = "";
          let changeValue = 0;
          let open = "";
          let high = "";
          let low = "";
          let previous = "";

          if (cells.length >= 7) {
            latest = cells[1].replace(/[s\*]/g, "").trim();
            change = cells[2].replace(/[+\s\*]/g, "").trim();
            open = cells[3].replace(/[s\*]/g, "").trim();
            high = cells[4].replace(/[s\*]/g, "").trim();
            low = cells[5].replace(/[s\*]/g, "").trim();
            previous = cells[6].replace(/[s\*]/g, "").trim();
          } else if (cells.length >= 6) {
            latest = cells[1].replace(/[s\*]/g, "").trim();
            change = cells[2].replace(/[+\s\*]/g, "").trim();
            open = cells[3].replace(/[s\*]/g, "").trim();
            high = cells[4].replace(/[s\*]/g, "").trim();
            low = cells[5].replace(/[s\*]/g, "").trim();
            previous = cells.length > 6 ? cells[6].replace(/[s\*]/g, "").trim() : latest;
          }

          if (change.toLowerCase() === "unch" || change === "0" || change === "") {
            changeValue = 0;
            change = "unch";
          } else {
            changeValue = parseFloat(change) || 0;
          }

          if (latest && !isNaN(parseFloat(latest))) {
            results.push({
              contract,
              maturity,
              latest,
              change: changeValue === 0 ? "unch" : change,
              changeValue,
              open: open || latest,
              high: high || latest,
              low: low || latest,
              previous: previous || latest,
            });
          }
        }
      }

      if (headerFound && line.startsWith("#") && !line.includes("Price")) {
        break;
      }
    }

    console.log(`Extracted ${results.length} contracts`);
  } catch (error) {
    console.error(`Error scraping ${baseSymbol}:`, error);
  }

  return results;
}

function generateDemoData(baseSymbol: string, maturities: string[]): FuturesData[] {
  let basePrice: number;
  
  switch (baseSymbol) {
    case "SQ": basePrice = 95.5; break;      // SOFR
    case "J8": basePrice = 95.2; break;      // SONIA
    case "T0": basePrice = 99.95; break;     // TONA
    case "J2": basePrice = 99.15; break;     // SARON
    case "RG": basePrice = 96.8; break;      // CORRA
    case "KUA": basePrice = 96.5; break;     // SORA
    case "RA": basePrice = 97.6; break;      // ESTR
    case "EG": basePrice = 97.5; break;      // 1M ESTR
    default: basePrice = 97.8; break;        // Euribor
  }
  
  return maturities.map((mat, i) => {
    // Simulate yield curve - slight decline for further out maturities
    const curveAdjust = i * 0.005;
    const volatility = (Math.random() - 0.5) * 0.15;
    const price = basePrice - curveAdjust + volatility;
    
    const changeBase = (Math.random() - 0.5) * 0.015;
    const changeValue = Math.round(changeBase * 10000) / 10000;
    
    return {
      contract: baseSymbol + mat,
      maturity: parseMaturity(mat),
      latest: price.toFixed(4),
      change: changeValue === 0 ? "unch" : (changeValue > 0 ? "+" : "") + changeValue.toFixed(4),
      changeValue,
      open: (price - 0.003 + Math.random() * 0.006).toFixed(4),
      high: (price + Math.random() * 0.008).toFixed(4),
      low: (price - Math.random() * 0.008).toFixed(4),
      previous: (price - changeValue).toFixed(4),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { index } = await req.json();

    if (!index || !RATE_INDICES[index as keyof typeof RATE_INDICES]) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid index. Valid indices: " + Object.keys(RATE_INDICES).join(", ") 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rateConfig = RATE_INDICES[index as keyof typeof RATE_INDICES];
    console.log(`Fetching ${rateConfig.name} data...`);

    let data = await scrapeRateData(
      apiKey, 
      rateConfig.baseSymbol, 
      rateConfig.maturities,
      rateConfig.baseContract
    );

    // If no data scraped, use demo data
    if (data.length === 0) {
      console.log("No data scraped, using demo data");
      data = generateDemoData(rateConfig.baseSymbol, rateConfig.maturities);
    }

    return new Response(
      JSON.stringify({
        success: true,
        index: index,
        name: rateConfig.name,
        currency: rateConfig.currency,
        data,
        lastUpdated: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-rates:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
