export type BulkLogisticsQuoteStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "QUOTED"
  | "CLOSED"
  | "CANCELLED";

export type BulkLogisticsListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type BulkLogisticsQuoteCustomer = {
  id: string;
  userId: string;
  name: string;
  businessType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  organizationId: string;
  organizationCode: string | null;
};

export type BulkLogisticsQuote = {
  id: string;
  requestNumber: string;
  status: BulkLogisticsQuoteStatus;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  materialName: string;
  quantityMt: string;
  pickupLocation: string;
  deliveryLocation: string;
  preferredDate: string | null;
  message: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  customer: BulkLogisticsQuoteCustomer;
};

export const BULK_LOGISTICS_STATUSES: BulkLogisticsQuoteStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUOTED",
  "CLOSED",
  "CANCELLED",
];
