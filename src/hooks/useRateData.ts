import { useQuery } from "@tanstack/react-query";
import { fetchRateData } from "@/lib/api/rates";

export function useRateData(index: string) {
  return useQuery({
    queryKey: ["rateData", index],
    queryFn: () => fetchRateData(index),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}
