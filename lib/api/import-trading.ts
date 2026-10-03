import { apiRequest } from "@/lib/api/client";
import type {
  AdminImportShipment,
  AdminImportShipmentDetail,
  AdminImportShipmentsQuery,
  ImportCriterionEvidence,
  ImportDeal,
  ImportDealStatus,
  ImportListing,
  ImportListingStatus,
  ImportNegotiationStatus,
  ImportQuantityUnit,
  ImportShipmentEventInput,
  ImportShipmentMode,
  ImportShipmentStatus,
  ImportShipmentUpdateInput,
  ImportSide,
} from "@/types/import-trading";

export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type PagedResult<T> = { items: T[]; meta?: PageMeta };

export type ShipmentPageMeta = PageMeta & {
  /** Platform-wide, independent of the active filters. */
  countsByStatus: Partial<Record<ImportShipmentStatus, number>>;
};

export const IMPORT_SHIPMENT_STATUSES: ImportShipmentStatus[] = [
  "BOOKED",
  "SHIPPED",
  "IN_TRANSIT",
  "ARRIVED",
  "CUSTOMS_CLEARANCE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
];

export const IMPORT_SHIPMENT_MODES: ImportShipmentMode[] = ["SEA", "AIR", "ROAD", "RAIL", "MULTIMODAL"];

type Query = Record<string, string | number | undefined | null>;

function qs(params: Query) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

async function paged<T>(path: string): Promise<PagedResult<T>> {
  const { data, meta } = await apiRequest<T[]>(path);
  return { items: data ?? [], meta };
}

async function get<T>(path: string): Promise<T> {
  return (await apiRequest<T>(path)).data;
}

async function post<T>(path: string, body: unknown = {}, method = "POST"): Promise<T> {
  return (await apiRequest<T>(path, { method, body: JSON.stringify(body) })).data;
}

// Types ---------------------------------------------------------------------

export type Org = { id: string; name: string };

export type AdminListing = ImportListing & {
  ownerOrgId?: string;
  ownerOrg?: Org & { legalName?: string | null; type?: string; email?: string | null };
  cancelReason?: string | null;
};

export type AdminDeal = Omit<ImportDeal, "myParty" | "awaitingMyConfirmation"> & {
  buyer?: Org;
  seller?: Org;
  terms?: unknown;
  updatedAt?: string;
};

export type AdminImportDocument = {
  id: string;
  documentNumber: string | null;
  category: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  status: string;
  version: number;
  previousDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: { id: string; name: string } | null;
  organization: Org | null;
  listing: { id: string; referenceNumber: string | null; side: ImportSide; status: ImportListingStatus } | null;
};

export type AdminDealDetail = AdminDeal & {
  negotiationSummary: {
    id: string;
    referenceNumber: string;
    status: ImportNegotiationStatus;
    roundCount: number;
    createdAt: string;
    agreedAt: string | null;
  };
  timeline: Array<Omit<AdminNegotiationEvent, "actorUserId">>;
  shipments: AdminImportShipment[];
  documents: AdminImportDocument[];
  auditTrail: AdminAuditEntry[];
};

export type AdminImportAuditRow = AdminAuditEntry & {
  organization: Org | null;
  entityReference: string | null;
  listingSide: ImportSide | null;
};

export type AdminNegotiationEvent = {
  sequence: number;
  type: string;
  actorParty: string;
  actorUserId: string | null;
  price: string | null;
  currencyCode: string | null;
  priceUnit: ImportQuantityUnit | null;
  quantity: string | null;
  quantityUnit: ImportQuantityUnit | null;
  incotermCode: string | null;
  paymentTermName: string | null;
  esd: string | null;
  lsd: string | null;
  note: string | null;
  createdAt: string;
};

type ListingRef = { id: string; referenceNumber: string | null; status?: ImportListingStatus };

export type AdminNegotiationRow = {
  id: string;
  referenceNumber: string;
  status: ImportNegotiationStatus;
  buyerOrg: Org;
  sellerOrg: Org;
  buyListing: ListingRef | null;
  sellListing: ListingRef | null;
  roundCount: number;
  lastActorParty: string | null;
  expiresAt: string | null;
  latestPrice: string | null;
  latestQuantity: string | null;
  currencyCode: string | null;
  updatedAt: string;
};

export type AdminNegotiationDetail = {
  id: string;
  referenceNumber: string;
  status: ImportNegotiationStatus;
  buyerOrg: Org;
  sellerOrg: Org;
  buyListing: ListingRef | null;
  sellListing: ListingRef | null;
  initiatedBy: string;
  lastActorParty: string | null;
  roundCount: number;
  expiresAt: string | null;
  agreedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  events: AdminNegotiationEvent[];
  deal: AdminDeal | null;
};

export type AdminMatch = {
  id: string;
  status: string;
  matchScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  evidence?: ImportCriterionEvidence[] | null;
  algorithmVersion: string;
  computedAt: string;
  buyListing: ListingRef;
  sellListing: ListingRef;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: { id: string; name: string } | null;
  metadata: Record<string, unknown> | null;
  previousData: unknown;
  newData: unknown;
  createdAt: string;
};

export type AdminListingDetail = AdminListing & {
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  negotiations: Array<
    Omit<AdminNegotiationDetail, "buyListing" | "sellListing" | "deal">
  >;
  matches: AdminMatch[];
  deals: AdminDeal[];
  documents: Array<{
    id: string;
    documentNumber: string | null;
    category: string;
    fileName: string;
    mimeType: string | null;
    status: string;
    createdAt: string;
  }>;
  auditTrail: AdminAuditEntry[];
};

export type ImportDashboard = {
  serverTime: string;
  activeBuyRequests: number;
  activeSellOffers: number;
  openNegotiations: number;
  agreedNegotiations: number;
  matchedListings: number;
  dealsPendingConfirmation: number;
  dealsConfirmed: number;
  expiredListings: number;
  confirmedVolumeMt: string;
  confirmedValueByCurrency: Array<{ currencyCode: string; value: string | null; deals: number }>;
  listingsBySideAndStatus: Record<ImportSide, Record<string, number>>;
  dealsByStatus: Record<string, number>;
  topProducts: Array<{ categoryId: string | null; name: string | null; activeListings: number }>;
  recentListings: AdminListing[];
  /** Published-or-later BUY listings (drafts excluded). */
  totalBuyRequests: number;
  totalSellOffers: number;
  cancelledListings: number;
  dealsCancelled: number;
  shipmentsBooked: number;
  /** SHIPPED through OUT_FOR_DELIVERY. */
  shipmentsInTransit: number;
  shipmentsDelivered: number;
  shipmentExceptions: number;
  shipmentsByStatus: Partial<Record<ImportShipmentStatus, number>>;
};

export type ImportSettings = {
  matchWeights: Record<string, number>;
  minMatchScore: number;
  allowCustomGrade: boolean;
  nearExpiryHours: number;
  negotiationTtlHours: number;
  buyRequestValidityDays: number;
  notificationChannels: string[];
  updatedAt: string | null;
  updatedById: string | null;
  criteria: string[];
};

export type ImportSettingsInput = Partial<
  Pick<
    ImportSettings,
    | "matchWeights"
    | "minMatchScore"
    | "allowCustomGrade"
    | "nearExpiryHours"
    | "negotiationTtlHours"
    | "buyRequestValidityDays"
  >
>;

export const MASTER_ENTITIES = [
  "currencies",
  "incoterms",
  "ports",
  "brands",
  "packaging",
  "document-requirements",
  "countries",
] as const;
export type MasterEntity = (typeof MASTER_ENTITIES)[number];

export type MasterRecord = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string | null;
  symbol?: string | null;
  decimalPlaces?: number | null;
  importEnabled?: boolean | null;
  priceBasis?: "ORIGIN" | "DESTINATION" | "ANY" | null;
  countryId?: string | null;
  countryCode?: string | null;
  country?: { id: string; code: string; name: string } | null;
  type?: string | null;
  documentCategory?: string | null;
  sortOrder?: number | null;
  updatedAt?: string;
};

export type MasterInput = Partial<
  Pick<
    MasterRecord,
    | "code"
    | "name"
    | "description"
    | "symbol"
    | "decimalPlaces"
    | "importEnabled"
    | "priceBasis"
    | "countryId"
    | "type"
    | "documentCategory"
    | "sortOrder"
  >
>;

// Dashboard & settings --------------------------------------------------------

export const getImportDashboard = () => get<ImportDashboard>("/admin/import/dashboard");

export const getImportSettings = () => get<ImportSettings>("/admin/import/settings");

export const updateImportSettings = (input: ImportSettingsInput) =>
  post<ImportSettings>("/admin/import/settings", input, "PATCH");

// Listings --------------------------------------------------------------------

export const listImportListings = (query: Query) =>
  paged<AdminListing>(`/admin/import/listings${qs(query)}`);

export const getImportListing = (id: string) =>
  get<AdminListingDetail>(`/admin/import/listings/${id}`);

export const setImportListingStatus = (
  id: string,
  status: "PAUSED" | "PUBLISHED" | "CANCELLED" | "EXPIRED",
  reason?: string,
) => post<AdminListingDetail>(`/admin/import/listings/${id}/status`, { status, reason });

export const rematchImportListing = (id: string) =>
  post<{ matched: number; newMatches: number }>(`/admin/import/listings/${id}/rematch`);

// Negotiations, deals, matches ------------------------------------------------

export const listImportNegotiations = (query: Query) =>
  paged<AdminNegotiationRow>(`/admin/import/negotiations${qs(query)}`);

export const getImportNegotiation = (id: string) =>
  get<AdminNegotiationDetail>(`/admin/import/negotiations/${id}`);

export const listImportDeals = (query: Query) =>
  paged<AdminDeal>(`/admin/import/deals${qs(query)}`);

export const getImportDeal = (id: string) => get<AdminDealDetail>(`/admin/import/deals/${id}`);

export const setImportDealStatus = (
  id: string,
  status: Extract<ImportDealStatus, "CANCELLED" | "PARTIALLY_FULFILLED" | "FULFILLED">,
  reason?: string,
) => post<AdminDealDetail>(`/admin/import/deals/${id}/status`, { status, reason });

// Shipments --------------------------------------------------------------------

export async function listShipments(
  params: AdminImportShipmentsQuery,
): Promise<{ items: AdminImportShipment[]; meta?: ShipmentPageMeta }> {
  const { data, meta } = await apiRequest<AdminImportShipment[]>(`/admin/import/shipments${qs(params)}`);
  return { items: data ?? [], meta: meta as ShipmentPageMeta | undefined };
}

export const getShipment = (id: string) =>
  get<AdminImportShipmentDetail>(`/admin/import/shipments/${id}`);

export const updateShipment = (id: string, body: ImportShipmentUpdateInput) =>
  post<AdminImportShipmentDetail>(`/admin/import/shipments/${id}`, body, "PATCH");

export const addShipmentEvent = (id: string, body: ImportShipmentEventInput) =>
  post<AdminImportShipmentDetail>(`/admin/import/shipments/${id}/events`, body);

// Documents & audit ------------------------------------------------------------

export const listImportDocuments = (query: Query) =>
  paged<AdminImportDocument>(`/admin/import/documents${qs(query)}`);

/** Signed URL is short-lived; every request is written to the audit log. */
export const getImportDocumentUrl = (id: string, disposition: "inline" | "attachment") =>
  get<{ url: string; fileName: string }>(`/admin/import/documents/${id}/download${qs({ disposition })}`);

export const listImportAuditLogs = (query: Query) =>
  paged<AdminImportAuditRow>(`/admin/import/audit-logs${qs(query)}`);

export const listImportMatches = (query: Query) =>
  paged<AdminMatch>(`/admin/import/matches${qs(query)}`);

// Master data -----------------------------------------------------------------

export const listImportMaster = (entity: MasterEntity, query: Query) =>
  paged<MasterRecord>(`/admin/import/master-data/${entity}${qs(query)}`);

export const createImportMaster = (entity: MasterEntity, input: MasterInput) =>
  post<MasterRecord>(`/admin/import/master-data/${entity}`, input);

export const updateImportMaster = (entity: MasterEntity, id: string, input: MasterInput) =>
  post<MasterRecord>(`/admin/import/master-data/${entity}/${id}`, input, "PATCH");

export const setImportMasterActive = (entity: MasterEntity, id: string, active: boolean) =>
  post<MasterRecord>(
    `/admin/import/master-data/${entity}/${id}/${active ? "activate" : "deactivate"}`,
  );
