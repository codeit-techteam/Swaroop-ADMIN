import { apiRequest } from "@/lib/api/client";
import type {
  BulkLogisticsListMeta,
  BulkLogisticsQuote,
} from "@/types/bulk-logistics-quote";

export type BulkLogisticsListResult = {
  items: BulkLogisticsQuote[];
  meta?: BulkLogisticsListMeta;
};

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function listBulkLogisticsQuotes(
  params: Record<string, string | number | undefined> = {},
): Promise<BulkLogisticsListResult> {
  const { data, meta } = await apiRequest<BulkLogisticsQuote[]>(
    `/admin/bulk-logistics-quotes${qs(params)}`,
  );
  return { items: data ?? [], meta };
}

export async function getBulkLogisticsQuote(id: string) {
  const { data } = await apiRequest<BulkLogisticsQuote>(`/admin/bulk-logistics-quotes/${id}`);
  return data;
}

export async function startBulkLogisticsReview(id: string) {
  const { data } = await apiRequest<BulkLogisticsQuote>(
    `/admin/bulk-logistics-quotes/${id}/start-review`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
  return data;
}

export async function markBulkLogisticsQuoted(id: string, notes?: string) {
  const { data } = await apiRequest<BulkLogisticsQuote>(
    `/admin/bulk-logistics-quotes/${id}/mark-quoted`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
  return data;
}

export async function closeBulkLogisticsQuote(id: string, notes?: string) {
  const { data } = await apiRequest<BulkLogisticsQuote>(
    `/admin/bulk-logistics-quotes/${id}/close`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
  return data;
}
