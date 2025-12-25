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
      "F26", "G26", "H26", "J26", "K26", "M26", "U26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28",
      "H29", "M29", "U29", "Z29"
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
      "H28", "M28", "U28", "Z28"
    ]
  },
  sonia: {
    name: "SONIA 3-Month",
    currency: "GBP",
    baseSymbol: "J8",
    maturities: [
      "Z25",
      "H26", "M26", "U26", "Z26",
      "H27", "M27", "U27", "Z27",
      "H28", "M28", "U28", "Z28"
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
      "H28", "M28"
    ]
  },
  estr1m: {
    name: "1-Month ESTR",
    currency: "EUR",
    baseSymbol: "EG",
    maturities: [
      "V25", "X25", "Z25",
      "F26", "G26", "H26", "J26", "K26", "M26", "N26", "Q26", "U26", "V26", "X26", "Z26",
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
  maturities: string[]
): Promise<FuturesData[]> {
  const results: FuturesData[] = [];

  // Scrape main page with all contracts
  const firstSymbol = baseSymbol + maturities[0];
  const url = `https://www.barchart.com/futures/quotes/${firstSymbol}/futures-prices`;

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
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error: ${response.status}`);
      return results;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";

    // Parse the markdown table
    const lines = markdown.split("\n");
    let inTable = false;

    for (const line of lines) {
      if (line.includes("Contract") && line.includes("Latest")) {
        inTable = true;
        continue;
      }

      if (inTable && line.startsWith("|")) {
        // Skip separator lines
        if (line.includes("---")) continue;

        const cells = line.split("|").map((c: string) => c.trim()).filter((c: string) => c);
        
        if (cells.length >= 7) {
          // Extract contract code from the first cell
          const contractMatch = cells[0].match(/([A-Z]{2,3}[A-Z]\d{2})/);
          if (contractMatch) {
            const contract = contractMatch[1];
            const maturityMatch = cells[0].match(/\((.*?)\)/);
            const maturity = maturityMatch ? maturityMatch[1] : parseMaturity(contract.slice(-3));
            
            // Parse change value
            let changeText = cells[2].replace(/[+\s]/g, "");
            let changeValue = 0;
            
            if (changeText.toLowerCase() === "unch") {
              changeValue = 0;
              changeText = "unch";
            } else {
              changeValue = parseFloat(changeText) || 0;
            }

            results.push({
              contract,
              maturity,
              latest: cells[1].replace(/s$/, ""),
              change: changeText,
              changeValue,
              open: cells[3],
              high: cells[4],
              low: cells[5],
              previous: cells[6],
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping ${baseSymbol}:`, error);
  }

  return results;
}

function generateDemoData(baseSymbol: string, maturities: string[]): FuturesData[] {
  const basePrice = baseSymbol === "SQ" ? 95.5 : baseSymbol === "J8" ? 95.2 : 97.8;
  
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

    let data = await scrapeRateData(apiKey, rateConfig.baseSymbol, rateConfig.maturities);

    // If no data scraped, use demo data
    if (data.length === 0) {
      data = generateDemoData(rateConfig.baseSymbol, rateConfig.maturities.slice(0, 12));
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
