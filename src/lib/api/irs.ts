import { supabase } from '@/integrations/supabase/client';
import { IRSResponse } from '@/lib/irsIndices';

export async function fetchIRSRates(currency: string): Promise<IRSResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('scrape-irs', {
      body: { currency },
    });

    if (error) {
      console.error('Error fetching IRS rates:', error);
      return { success: false, error: error.message };
    }

    return data as IRSResponse;
  } catch (error) {
    console.error('Error fetching IRS rates:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
