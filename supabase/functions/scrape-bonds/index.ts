const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Country to currency mapping
const COUNTRY_CURRENCIES: Record<string, string> = {
  'switzerland': 'CHF',
  'taiwan': 'TWD',
  'thailand': 'THB',
  'china': 'CNY',
  'japan': 'JPY',
  'singapore': 'SGD',
  'denmark': 'DKK',
  'germany': 'EUR',
  'sweden': 'SEK',
  'netherlands': 'EUR',
  'norway': 'NOK',
  'finland': 'EUR',
  'austria': 'EUR',
  'australia': 'AUD',
  'canada': 'CAD',
  'ireland': 'EUR',
  'france': 'EUR',
  'belgium': 'EUR',
  'new-zealand': 'NZD',
  'united-kingdom': 'GBP',
  'south-korea': 'KRW',
  'malta': 'EUR',
  'czech-republic': 'CZK',
  'israel': 'ILS',
  'slovakia': 'EUR',
  'slovenia': 'EUR',
  'iceland': 'ISK',
  'spain': 'EUR',
  'hong-kong': 'HKD',
  'united-states': 'USD',
  'poland': 'PLN',
  'italy': 'EUR',
  'portugal': 'EUR',
  'croatia': 'EUR',
  'greece': 'EUR',
  'cyprus': 'EUR',
  'hungary': 'HUF',
  'romania': 'RON',
  'india': 'INR',
  'indonesia': 'IDR',
  'philippines': 'PHP',
  'colombia': 'COP',
  'south-africa': 'ZAR',
  'mexico': 'MXN',
  'brazil': 'BRL',
  'russia': 'RUB',
  'turkey': 'TRY',
  'argentina': 'ARS',
  'morocco': 'MAD',
  'egypt': 'EGP',
  'nigeria': 'NGN',
  'kenya': 'KES',
  'vietnam': 'VND',
  'malaysia': 'MYR',
  'saudi-arabia': 'SAR',
  'united-arab-emirates': 'AED',
  'qatar': 'QAR',
  'kuwait': 'KWD',
  'bahrain': 'BHD',
  'oman': 'OMR',
  'chile': 'CLP',
  'peru': 'PEN',
  'pakistan': 'PKR',
  'bangladesh': 'BDT',
  'sri-lanka': 'LKR',
};

interface CountryBondData {
  country: string;
  countrySlug: string;
  currency: string;
  rating: string;
  yield10Y: number | null;
  bankRate: number | null;
  spreadVsBund: number | null;
  spreadVsTNote: number | null;
  spreadVsBankRate: number | null;
}

interface BondYieldData {
  maturity: string;
  maturityYears: number;
  yield: number | null;
  chg1M: number | null;
  chg6M: number | null;
  chg12M: number | null;
  price: number | null;
  priceChg1M: number | null;
  priceChg6M: number | null;
  priceChg12M: number | null;
  capitalGrowth: number | null;
  lastUpdate: string;
}

function parsePercentage(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[%,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseBasisPoints(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/bp/gi, '').replace(/[,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function slugify(country: string): string {
  return country
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function parseMainTable(markdown: string): CountryBondData[] {
  const results: CountryBondData[] = [];
  const lines = markdown.split('\n');
  
  let inTable = false;
  
  for (const line of lines) {
    // Look for table rows with country data
    if (line.includes('|') && !line.includes('---')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      
      // Skip header rows
      if (cells.some(c => c.toLowerCase().includes('country') || c.toLowerCase().includes('rating') || c.toLowerCase().includes('s&p'))) {
        inTable = true;
        continue;
      }
      
      if (inTable && cells.length >= 5) {
        // Try to extract country name - usually first non-empty meaningful cell
        let countryName = '';
        let startIdx = 0;
        
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          // Skip flag emojis, images, or very short cells
          if (cell.length > 2 && !cell.startsWith('!') && !cell.startsWith('[') && 
              !/^[A-Z]{2,4}[+-]?$/.test(cell) && !/^\d/.test(cell)) {
            countryName = cell.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
            startIdx = i + 1;
            break;
          }
        }
        
        if (!countryName) continue;
        
        const slug = slugify(countryName);
        const currency = COUNTRY_CURRENCIES[slug] || 'USD';
        
        // Parse remaining cells
        const remainingCells = cells.slice(startIdx);
        
        let rating = '';
        let yield10Y: number | null = null;
        let bankRate: number | null = null;
        let spreadVsBund: number | null = null;
        let spreadVsTNote: number | null = null;
        let spreadVsBankRate: number | null = null;
        
        for (const cell of remainingCells) {
          const trimmed = cell.trim();
          
          // Rating (AAA, AA+, A-, BBB, etc.)
          if (/^[A-D]{1,3}[+-]?$/.test(trimmed) || trimmed === 'NR') {
            rating = trimmed;
          }
          // Percentage values (yield, bank rate)
          else if (trimmed.includes('%')) {
            const val = parsePercentage(trimmed);
            if (yield10Y === null) {
              yield10Y = val;
            } else if (bankRate === null) {
              bankRate = val;
            }
          }
          // Basis points (spreads)
          else if (trimmed.toLowerCase().includes('bp')) {
            const val = parseBasisPoints(trimmed);
            if (spreadVsBund === null) {
              spreadVsBund = val;
            } else if (spreadVsTNote === null) {
              spreadVsTNote = val;
            } else if (spreadVsBankRate === null) {
              spreadVsBankRate = val;
            }
          }
        }
        
        if (countryName && (yield10Y !== null || rating)) {
          results.push({
            country: countryName,
            countrySlug: slug,
            currency,
            rating,
            yield10Y,
            bankRate,
            spreadVsBund,
            spreadVsTNote,
            spreadVsBankRate,
          });
        }
      }
    }
  }
  
  return results;
}

function parseCountryYieldTable(markdown: string): BondYieldData[] {
  const results: BondYieldData[] = [];
  const lines = markdown.split('\n');
  
  // Find lines that look like maturity data
  const maturityPatterns = [
    /(\d+)\s*(months?|m)\b/i,
    /(\d+)\s*(years?|y)\b/i,
  ];
  
  for (const line of lines) {
    if (!line.includes('|')) continue;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 3) continue;
    
    // Look for maturity in first cells
    let maturity = '';
    let maturityYears = 0;
    let startIdx = 0;
    
    for (let i = 0; i < Math.min(3, cells.length); i++) {
      const cell = cells[i].toLowerCase();
      
      const monthMatch = cell.match(/(\d+)\s*(months?|m)\b/i);
      const yearMatch = cell.match(/(\d+)\s*(years?|y)\b/i);
      
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        maturityYears = months / 12;
        maturity = `${months} months`;
        startIdx = i + 1;
        break;
      } else if (yearMatch) {
        const years = parseInt(yearMatch[1]);
        maturityYears = years;
        maturity = `${years} years`;
        startIdx = i + 1;
        break;
      }
    }
    
    if (!maturity || maturityYears === 0) continue;
    
    // Parse remaining data
    const remainingCells = cells.slice(startIdx);
    
    let yieldVal: number | null = null;
    let chg1M: number | null = null;
    let chg6M: number | null = null;
    let chg12M: number | null = null;
    let price: number | null = null;
    let priceChg1M: number | null = null;
    let priceChg6M: number | null = null;
    let priceChg12M: number | null = null;
    let capitalGrowth: number | null = null;
    let lastUpdate = '';
    
    let percentCount = 0;
    let bpCount = 0;
    let priceCount = 0;
    
    for (const cell of remainingCells) {
      const trimmed = cell.trim();
      
      // Date pattern
      if (/\d{1,2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(trimmed)) {
        lastUpdate = trimmed;
        continue;
      }
      
      // Percentage (yield)
      if (trimmed.includes('%') && !trimmed.toLowerCase().includes('bp')) {
        const val = parsePercentage(trimmed);
        if (yieldVal === null) {
          yieldVal = val;
        }
        continue;
      }
      
      // Basis points changes
      if (trimmed.toLowerCase().includes('bp')) {
        const val = parseBasisPoints(trimmed);
        if (bpCount === 0) chg1M = val;
        else if (bpCount === 1) chg6M = val;
        else if (bpCount === 2) chg12M = val;
        bpCount++;
        continue;
      }
      
      // Pure numbers (prices or growth)
      const numVal = parseFloat(trimmed.replace(/[,+]/g, ''));
      if (!isNaN(numVal)) {
        if (numVal > 50 && numVal < 150) {
          // Likely a price
          if (price === null) price = numVal;
        } else if (numVal > 0 && numVal < 10) {
          // Likely capital growth
          capitalGrowth = numVal;
        }
      }
    }
    
    results.push({
      maturity,
      maturityYears,
      yield: yieldVal,
      chg1M,
      chg6M,
      chg12M,
      price,
      priceChg1M,
      priceChg6M,
      priceChg12M,
      capitalGrowth,
      lastUpdate,
    });
  }
  
  // Sort by maturity
  results.sort((a, b) => a.maturityYears - b.maturityYears);
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, country } = await req.json();
    
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let url: string;
    if (type === 'countries') {
      url = 'https://www.worldgovernmentbonds.com/';
    } else if (type === 'country' && country) {
      url = `https://www.worldgovernmentbonds.com/country/${country}/`;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request type. Use "countries" or "country" with country slug.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping ${type}: ${url}`);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';
    
    if (type === 'countries') {
      const countries = parseMainTable(markdown);
      console.log(`Parsed ${countries.length} countries`);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: countries,
          scrapedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const yields = parseCountryYieldTable(markdown);
      const currency = COUNTRY_CURRENCIES[country] || 'USD';
      console.log(`Parsed ${yields.length} yield points for ${country}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          country,
          currency,
          data: yields,
          scrapedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error scraping bonds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
