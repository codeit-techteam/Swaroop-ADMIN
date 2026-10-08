import { apiRequest } from "@/lib/api/client";

export type WebsiteEnquiryStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type WebsiteEnquiryTopic =
  | "BUY_MATERIALS"
  | "SELL_MATERIALS"
  | "CREDIT"
  | "LOGISTICS"
  | "PARTNERSHIP"
  | "OTHER";

export interface WebsiteEnquiry {
  id: string;
  referenceNumber: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  topic: WebsiteEnquiryTopic;
  message: string;
  status: WebsiteEnquiryStatus;
  source: string;
  pagePath: string | null;
  adminNotes: string | null;
  handledByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ENQUIRY_TOPIC_LABELS: Record<WebsiteEnquiryTopic, string> = {
  BUY_MATERIALS: "Buy materials",
  SELL_MATERIALS: "Sell materials",
  CREDIT: "Business credit",
  LOGISTICS: "Logistics",
  PARTNERSHIP: "Partnership",
  OTHER: "Other",
};

export const ENQUIRY_STATUS_LABELS: Record<WebsiteEnquiryStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

export async function listWebsiteEnquiries() {
  const rows: WebsiteEnquiry[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, meta } = await apiRequest<WebsiteEnquiry[]>(`/admin/enquiries?page=${page}&limit=100`);
    rows.push(...(data ?? []));
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  return rows;
}

export async function updateWebsiteEnquiry(
  id: string,
  input: { status?: WebsiteEnquiryStatus; adminNotes?: string },
) {
  const { data } = await apiRequest<WebsiteEnquiry>(`/admin/enquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}
