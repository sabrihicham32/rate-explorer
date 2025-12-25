import { supabase } from "@/integrations/supabase/client";
import { RateResponse } from "@/lib/rateIndices";

export async function fetchRateData(index: string): Promise<RateResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("scrape-rates", {
      body: { index },
    });

    if (error) {
      console.error("Error fetching rate data:", error);
      return { success: false, error: error.message };
    }

    return data as RateResponse;
  } catch (err) {
    console.error("Error calling edge function:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}
