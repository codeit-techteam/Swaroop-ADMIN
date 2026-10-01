/** Wire types for `/api/v1/import/*`. Decimals travel as strings. */

export type ImportSide = "BUY" | "SELL";
export type ImportParty = "BUYER" | "SELLER";

export type ImportListingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "MATCHING"
  | "OFFER_RECEIVED"
  | "NEGOTIATION"
  | "MATCHED"
  | "DEAL_CONFIRMED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "PAUSED"
  | "EXPIRED"
  | "CANCELLED";

export type ImportNegotiationStatus =
  | "OPEN"
  | "AGREED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED"
  | "CANCELLED";

export type ImportDealStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "CANCELLED";

export type ImportQuantityUnit = "MT" | "KG" | "CONTAINER" | "OTHER";

export type Named = { id: string; code: string; name: string };

export type ImportCurrency = Named & {
  symbol: string | null;
  decimalPlaces: number;
};

export type ImportIncoterm = Named & {
  description?: string | null;
  priceBasis?: string | null;
};

export type ImportPaymentTerm = {
  id: string;
  code: string;
  name: string;
  displayName?: string | null;
  method?: string | null;
  currencyCodes: string[];
};

export type ImportPort = Named & { countryCode: string; type?: string };

export type ImportDocumentRequirement = Named & {
  description?: string | null;
  documentCategory?: string | null;
};

export type ImportMasterBundle = {
  currencies: ImportCurrency[];
  defaultCurrencyCode: string | null;
  incoterms: ImportIncoterm[];
  packaging: Named[];
  documentRequirements: ImportDocumentRequirement[];
  countries: Named[];
  paymentTerms: ImportPaymentTerm[];
  allowCustomGrade: boolean;
  enums: {
    quantityUnits: ImportQuantityUnit[];
    priceTypes: string[];
    gstTreatments: string[];
    shipmentPermissions: string[];
    shipmentTypes: string[];
    containerSizes: string[];
    inspectionTypes: string[];
    readyStockTypes: string[];
    portTypes: string[];
  };
};

export type ImportProduct = {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  parentGroup?: string | null;
};

export type ImportGrade = {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  categoryId: string;
};

export type ImportBrand = Named & { country?: Named | null };

export type ImportListing = {
  id: string;
  referenceNumber: string | null;
  side: ImportSide;
  status: ImportListingStatus;
  source: string;
  version: number;
  counterpartyRef: string;
  allowedTransitions?: ImportListingStatus[];
  viewerRole?: "OWNER" | "COUNTERPARTY";
  product: {
    categoryId: string | null;
    category: Named | null;
    gradeId: string | null;
    grade: (Named & { categoryId?: string }) | null;
    customGradeName: string | null;
    brandId: string | null;
    brand: Named | null;
    originCountryId: string | null;
    originCountry: Named | null;
    quantity: string | null;
    quantityUnit: ImportQuantityUnit;
    packagingId: string | null;
    packaging: Named | null;
    application: string | null;
    hsCode: string | null;
    casNumber: string | null;
  };
  commercial: {
    price: string | null;
    currencyId: string | null;
    currencyCode: string | null;
    currency: ImportCurrency | null;
    priceUnit: ImportQuantityUnit;
    priceType: string | null;
    incotermId: string | null;
    incoterm: ImportIncoterm | null;
    priceBasisPortId: string | null;
    priceBasisPort: ImportPort | null;
    priceBasisLocation: string | null;
    paymentTermId: string | null;
    paymentTerm: ImportPaymentTerm | null;
    gstTreatment: string | null;
  };
  shipping: {
    polId: string | null;
    pol: ImportPort | null;
    podId: string | null;
    pod: ImportPort | null;
    esd: string | null;
    lsd: string | null;
    transitMinDays: number | null;
    transitMaxDays: number | null;
    estimatedEta: { from: string; to: string } | null;
    partialShipment: string | null;
    transshipment: string | null;
    shipmentType: string | null;
    containerSize: string | null;
    containerCount: number | null;
  };
  quality: {
    specification: string | null;
    inspectionType: string | null;
    documentRequirementIds: string[];
    documentRequirements: ImportDocumentRequirement[];
  };
  buyTerms: {
    acceptableQuantityMin: string | null;
    acceptableQuantityMax: string | null;
    requiredDeliveryDate: string | null;
    specialRequirements: string | null;
  } | null;
  sellTerms: {
    moq: string | null;
    maximumQuantity: string | null;
    readyStockType: string | null;
  } | null;
  remarks: string | null;
  validity: {
    validFrom: string | null;
    validUntil: string | null;
    serverTime: string;
    isExpired: boolean;
    secondsRemaining: number | null;
  };
  publishedAt: string | null;
  cancelReason?: string | null;
  stats?: { matches: number; negotiations: Record<string, number> };
  myNegotiation?: {
    id: string;
    referenceNumber: string;
    status: ImportNegotiationStatus;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportCriterionEvidence = {
  criterion: string;
  weight: number;
  matched: boolean;
  reason: string;
};

export type ImportMatch = {
  id: string;
  status: "SUGGESTED" | "DISMISSED" | "NEGOTIATING" | "CONVERTED" | "STALE";
  matchScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  evidence: ImportCriterionEvidence[];
  algorithmVersion: string;
  computedAt: string;
  listing: ImportListing;
};

export type ImportListingSummary = {
  id: string;
  referenceNumber: string | null;
  side: ImportSide;
  status: ImportListingStatus;
  product: string | null;
  grade: string | null;
  brand: string | null;
  originCountry: string | null;
  quantity: string | null;
  quantityUnit: ImportQuantityUnit;
  price: string | null;
  currencyCode: string | null;
  priceUnit: ImportQuantityUnit;
  incoterm: string | null;
  priceBasis: string | null;
  pol: { code: string; name: string } | null;
  pod: { code: string; name: string } | null;
  validUntil: string | null;
};

export type ImportNegotiationEvent = {
  id: string;
  sequence: number;
  type: "OPENED" | "COUNTER" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
  actorParty: ImportParty | "SYSTEM" | null;
  price: string | null;
  currencyCode: string | null;
  priceUnit: ImportQuantityUnit | null;
  quantity: string | null;
  quantityUnit: ImportQuantityUnit | null;
  moq: string | null;
  incotermCode: string | null;
  paymentTermId: string | null;
  paymentTermName: string | null;
  esd: string | null;
  lsd: string | null;
  inspectionType: string | null;
  otherTerms: string | null;
  note: string | null;
  createdAt: string;
};

export type ImportNegotiation = {
  id: string;
  referenceNumber: string;
  status: ImportNegotiationStatus;
  myParty: ImportParty;
  counterpartyRef: string;
  initiatedBy: ImportParty;
  lastActorParty: ImportParty | null;
  roundCount: number;
  awaitingMyResponse: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  agreedAt: string | null;
  closedAt: string | null;
  listing: ImportListingSummary | null;
  buyListing: ImportListingSummary | null;
  sellListing: ImportListingSummary | null;
  latestTerms: ImportNegotiationEvent | null;
  deal: { id: string; referenceNumber: string; status: ImportDealStatus } | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportNegotiationDetail = ImportNegotiation & {
  fixedTerms: {
    currencyCode: string | null;
    priceUnit: ImportQuantityUnit | null;
    quantityUnit: ImportQuantityUnit | null;
    incoterm: string | null;
    priceBasis: string | null;
  };
  events: ImportNegotiationEvent[];
  allowedActions: Array<"COUNTER" | "ACCEPT" | "REJECT" | "WITHDRAW">;
};

export type ImportDeal = {
  id: string;
  referenceNumber: string;
  status: ImportDealStatus;
  myParty: ImportParty;
  negotiation: { id: string; referenceNumber: string };
  buyListing: { id: string; referenceNumber: string | null } | null;
  sellListing: { id: string; referenceNumber: string | null } | null;
  buyerRef: string;
  sellerRef: string;
  buyer?: { id: string; name: string };
  seller?: { id: string; name: string };
  price: string;
  currencyCode: string;
  priceUnit: ImportQuantityUnit;
  quantity: string;
  quantityUnit: ImportQuantityUnit;
  incotermCode: string | null;
  priceBasisLocation: string | null;
  paymentTermName: string | null;
  esd: string | null;
  lsd: string | null;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  awaitingMyConfirmation: boolean;
  confirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type ImportDocument = {
  id: string;
  category: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  status: string;
  createdAt: string;
};

export type ImportSummary = {
  serverTime: string;
  buy?: {
    listings: Record<string, number>;
    openNegotiations: number;
    pendingDeals: number;
  };
  sell?: {
    listings: Record<string, number>;
    openNegotiations: number;
    pendingDeals: number;
  };
};

export type Paged<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

/** Every editable listing field, as sent to POST/PATCH. */
export type ImportListingInput = {
  categoryId?: string | null;
  gradeId?: string | null;
  customGradeName?: string | null;
  brandId?: string | null;
  originCountryId?: string | null;
  quantity?: string | null;
  quantityUnit?: ImportQuantityUnit;
  packagingId?: string | null;
  application?: string | null;
  hsCode?: string | null;
  casNumber?: string | null;
  price?: string | null;
  currencyId?: string | null;
  priceUnit?: ImportQuantityUnit;
  priceType?: string | null;
  incotermId?: string | null;
  priceBasisPortId?: string | null;
  priceBasisLocation?: string | null;
  paymentTermId?: string | null;
  gstTreatment?: string | null;
  polId?: string | null;
  podId?: string | null;
  esd?: string | null;
  lsd?: string | null;
  transitMinDays?: number | null;
  transitMaxDays?: number | null;
  partialShipment?: string | null;
  transshipment?: string | null;
  shipmentType?: string | null;
  containerSize?: string | null;
  containerCount?: number | null;
  specification?: string | null;
  inspectionType?: string | null;
  documentRequirementIds?: string[];
  acceptableQuantityMin?: string | null;
  acceptableQuantityMax?: string | null;
  requiredDeliveryDate?: string | null;
  specialRequirements?: string | null;
  moq?: string | null;
  maximumQuantity?: string | null;
  readyStockType?: string | null;
  remarks?: string | null;
  validUntil?: string | null;
};

export type ImportTermsInput = {
  price?: string;
  quantity?: string;
  moq?: string;
  paymentTermId?: string;
  esd?: string;
  lsd?: string;
  inspectionType?: string;
  otherTerms?: string;
  note?: string;
};
