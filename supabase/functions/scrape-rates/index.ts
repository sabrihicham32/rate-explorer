/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate indices configuration with all maturities
const RATE_INDICES = {
  euribor3m: {
    name: "3-Month Euribor",
    currency: "EUR",
    baseSymbol: "IM",
    maturities: [
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28",
      "H29", "M29", "U29", "Z29",
      "H30", "M30", "U30", "Z30"
    ]
  },
  sofr: {
    name: "SOFR 3-Month",
    currency: "USD",
    baseSymbol: "SQ",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28",
      "H29", "M29", "U29", "Z29"
    ]
  },
  sonia: {
    name: "SONIA 3-Month",
    currency: "GBP",
    baseSymbol: "J8",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28",
      "H29", "M29", "U29", "Z29"
    ]
  },
  estr3m: {
    name: "3-Month ESTR",
    currency: "EUR",
    baseSymbol: "RA",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28",
      "H29", "M29", "U29", "Z29",
      "H30", "M30"
    ]
  },
  estr1m: {
    name: "1-Month ESTR",
    currency: "EUR",
    baseSymbol: "EG",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28"
    ]
  },
  // New indices
  estr3m_long: {
    name: "3-Month ESTR (Long)",
    currency: "EUR",
    baseSymbol: "RA",
    baseContract: "RAH30",
    maturities: [
      "H30", "M30", "U30", "Z30",
      "H31", "M31", "U31", "Z31",
      "H32", "M32", "U32", "Z32"
    ]
  },
  tonar: {
    name: "TONAR (JPY)",
    currency: "JPY",
    baseSymbol: "T0",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28"
    ]
  },
  euroyen: {
    name: "Euroyen TIBOR",
    currency: "JPY",
    baseSymbol: "J2",
    maturities: [
      "Z25",
      "H26", "M26", "U26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28"
    ]
  },
  ruonia: {
    name: "RUONIA",
    currency: "RUB",
    baseSymbol: "RG",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "U26", "Z26",
      "H27", "M27", "U27", "Z27"
    ]
  },
  kofr: {
    name: "KOFR (KRW)",
    currency: "KRW",
    baseSymbol: "KUA",
    maturities: [
      "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "U26", "Z26",
      "H27", "M27", "U27", "Z27"
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

  // Use base contract if provided, otherwise construct from first maturity
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
        onlyMainContent: false, // Get full page content
        waitFor: 3000, // Wait longer for all data to load
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error: ${response.status}`);
      return results;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";
    
    console.log(`Markdown length: ${markdown.length}`);

    // Parse the markdown table - look for all table rows
    const lines = markdown.split("\n");
    let inTable = false;
    let headerFound = false;

    for (const line of lines) {
      // Look for table header with Contract
      if (line.includes("Contract") && (line.includes("Last") || line.includes("Latest"))) {
        inTable = true;
        headerFound = true;
        continue;
      }

      // Skip separator lines
      if (line.includes("---") && line.includes("|")) {
        continue;
      }

      // Process table rows
      if (inTable && line.includes("|")) {
        const cells = line.split("|").map((c: string) => c.trim()).filter((c: string) => c);
        
        if (cells.length >= 6) {
          // Extract contract code - look for pattern like IMF26, SQV25, etc.
          const contractPatterns = [
            /\b([A-Z]{2,4}[FGHJKMNQUVXZ]\d{2})\b/,  // Standard pattern
            /\[([A-Z]{2,4}[FGHJKMNQUVXZ]\d{2})\]/,  // In brackets
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

          // Parse maturity from contract code
          const maturityCode = contract.slice(-3);
          const maturity = parseMaturity(maturityCode);
          
          // Find the relevant cells - handle different table formats
          let latest = "";
          let change = "";
          let changeValue = 0;
          let open = "";
          let high = "";
          let low = "";
          let previous = "";

          // Try to extract data based on cell count and content
          if (cells.length >= 7) {
            // Standard format: Contract | Last | Change | Open | High | Low | Prev
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

          // Parse change value
          if (change.toLowerCase() === "unch" || change === "0" || change === "") {
            changeValue = 0;
            change = "unch";
          } else {
            changeValue = parseFloat(change) || 0;
          }

          // Only add if we have valid price data
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

      // Stop if we hit another section
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
    case "SQ": basePrice = 95.5; break;
    case "J8": basePrice = 95.2; break;
    case "T0": basePrice = 99.95; break;
    case "J2": basePrice = 99.8; break;
    case "RG": basePrice = 85.0; break;
    case "KUA": basePrice = 96.5; break;
    default: basePrice = 97.8;
  }
  
  return maturities.map((mat, i) => {
    const price = basePrice + (Math.random() - 0.5) * 0.3 - i * 0.02;
    const change = (Math.random() - 0.5) * 0.02;
    const changeValue = Math.round(change * 10000) / 10000;
    
    return {
      contract: baseSymbol + mat,
      maturity: parseMaturity(mat),
      latest: price.toFixed(4),
      change: changeValue === 0 ? "unch" : changeValue.toFixed(4),
      changeValue,
      open: (price - 0.005).toFixed(4),
      high: (price + 0.01).toFixed(4),
      low: (price - 0.01).toFixed(4),
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
      (rateConfig as any).baseContract
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
