import { useQuery } from '@tanstack/react-query';
import { fetchIRSRates } from '@/lib/api/irs';
import { IRSData, IRSResponse } from '@/lib/irsIndices';

export function useIRSData(currency: string) {
  return useQuery<IRSResponse>({
    queryKey: ['irs-rates', currency],
    queryFn: () => fetchIRSRates(currency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!currency,
  });
}
