import type {
  AuditLog,
  CreditAccount,
  NotificationItem,
  PlatformDocument,
  Receivable,
} from "@/types";

export const creditAccounts: CreditAccount[] = [
  { id: "CR-01", customerId: "CUS-10302", customer: "Delta Packaging Mills", approved: 12000000, used: 9100000, available: 2900000, risk: "High", overdue: 620000 },
  { id: "CR-02", customerId: "CUS-10284", customer: "Apex Polymers Pvt Ltd", approved: 8500000, used: 4200000, available: 4300000, risk: "Medium", overdue: 180000 },
  { id: "CR-03", customerId: "CUS-10390", customer: "Eastern Pipe Works", approved: 7200000, used: 3100000, available: 4100000, risk: "Low", overdue: 0 },
  { id: "CR-04", customerId: "CUS-10361", customer: "Coastal Resins", approved: 5600000, used: 1800000, available: 3800000, risk: "Low", overdue: 0 },
  { id: "CR-05", customerId: "CUS-10377", customer: "Vindhya Compounds", approved: 4000000, used: 2200000, available: 1800000, risk: "Medium", overdue: 400000 },
  { id: "CR-06", customerId: "CUS-10318", customer: "Sierra Films", approved: 2500000, used: 400000, available: 2100000, risk: "Low", overdue: 0 },
];

export const receivables: Receivable[] = [
  { id: "INV-90021", customer: "Apex Polymers Pvt Ltd", invoice: "INV-90021", invoiceDate: "2026-08-20", dueDate: "2026-09-04", amount: 1970000, paid: 1790000, outstanding: 180000, daysOverdue: 1, risk: "Medium", status: "Overdue" },
  { id: "INV-90018", customer: "Delta Packaging Mills", invoice: "INV-90018", invoiceDate: "2026-08-12", dueDate: "2026-08-27", amount: 6200000, paid: 5580000, outstanding: 620000, daysOverdue: 9, risk: "High", status: "Overdue" },
  { id: "INV-90011", customer: "Coastal Resins", invoice: "INV-90011", invoiceDate: "2026-09-03", dueDate: "2026-09-18", amount: 7392000, paid: 7392000, outstanding: 0, daysOverdue: 0, risk: "Low", status: "Collected" },
  { id: "INV-90004", customer: "Eastern Pipe Works", invoice: "INV-90004", invoiceDate: "2026-09-03", dueDate: "2026-09-18", amount: 2428800, paid: 0, outstanding: 2428800, daysOverdue: 0, risk: "Medium", status: "Due" },
  { id: "INV-89966", customer: "Eastern Pipe Works", invoice: "INV-89966", invoiceDate: "2026-09-04", dueDate: "2026-10-04", amount: 3384000, paid: 800000, outstanding: 2584000, daysOverdue: 0, risk: "Low", status: "Current" },
  { id: "INV-89770", customer: "Vindhya Compounds", invoice: "INV-89770", invoiceDate: "2026-06-02", dueDate: "2026-07-02", amount: 900000, paid: 500000, outstanding: 400000, daysOverdue: 65, risk: "High", status: "Overdue" },
];

export const notifications: NotificationItem[] = [
  { id: "NTF-1", type: "Order", title: "Order #PT-9021 placed", body: "Apex Polymers placed PP RAFFIA from Customer Web.", createdAt: "2026-09-05T07:18:00+05:30", read: false, href: "/orders", source: "Customer Web" },
  { id: "NTF-2", type: "KYC", title: "KYC submitted — Horizon Petrochem", body: "GST pack awaiting assignment.", createdAt: "2026-09-04T19:50:00+05:30", read: false, href: "/kyc", source: "Customer App" },
  { id: "NTF-3", type: "Payment", title: "Payment verified PAY-55101", body: "RTGS UTR9X22190 confirmed by finance.", createdAt: "2026-09-05T07:42:00+05:30", read: false, href: "/payments", source: "Admin Portal" },
  { id: "NTF-4", type: "Dispatch", title: "Dispatch update SHP-4401", body: "ULSD parcel crossed Ankleshwar checkpoint.", createdAt: "2026-09-05T06:55:00+05:30", read: true, href: "/logistics", source: "Seller App" },
  { id: "NTF-5", type: "Dispute", title: "Open dispute DSP-198", body: "Quality claim on Hygain HS1000R.", createdAt: "2026-09-04T10:40:00+05:30", read: false, href: "/disputes", source: "Customer App" },
  { id: "NTF-6", type: "Seller", title: "Offer pending review OFF-7718", body: "Oriental Polymers submitted PPF03 offer.", createdAt: "2026-09-05T08:10:00+05:30", read: true, href: "/offers", source: "Seller Web" },
  { id: "NTF-7", type: "Customer", title: "New buyer on Customer App", body: "Horizon Petrochem completed signup.", createdAt: "2026-09-04T19:40:00+05:30", read: true, href: "/customers", source: "Customer App" },
  { id: "NTF-8", type: "System", title: "Nightly reconciliation complete", body: "Payments and receivables synced.", createdAt: "2026-09-05T02:10:00+05:30", read: true, href: "/payments", source: "Admin Portal" },
  { id: "NTF-9", type: "Procurement", title: "New procurement request received", body: "PO-8790-L8 ULSD Fuel submitted from Customer App.", createdAt: "2026-09-05T08:00:00+05:30", read: false, href: "/procurement?id=PO-8790-L8", source: "Customer App" },
  { id: "NTF-10", type: "Procurement", title: "Approval required", body: "PO-8810-D3 is pending finance approval.", createdAt: "2026-09-05T08:40:00+05:30", read: false, href: "/procurement?id=PO-8810-D3", source: "Admin Portal" },
  { id: "NTF-11", type: "Procurement", title: "Supplier counter offer received", body: "Global Energy Ltd. revised ULSD Fuel on PO-8829-01.", createdAt: "2026-09-05T09:10:00+05:30", read: false, href: "/procurement?id=PO-8829-01", source: "Seller Web" },
  { id: "NTF-12", type: "Procurement", title: "Seller confirmation received", body: "Hygain Commodities accepted PO-8804-G2.", createdAt: "2026-09-05T08:00:00+05:30", read: true, href: "/procurement?id=PO-8804-G2", source: "Seller Web" },
  { id: "NTF-13", type: "Procurement", title: "PO created", body: "PO-8808-F1 issued to Oriental Polymers.", createdAt: "2026-09-04T13:10:00+05:30", read: true, href: "/procurement?id=PO-8808-F1", source: "Admin Portal" },
  { id: "NTF-14", type: "Dispatch", title: "Dispatch delayed", body: "SHP-4370 Brent parcel is on hold at depot.", createdAt: "2026-09-04T16:00:00+05:30", read: false, href: "/logistics?id=SHP-4370", source: "Admin Portal" },
  { id: "NTF-15", type: "Content", title: "Diwali Fuel Offer scheduled", body: "Festival campaign is scheduled for 01 Oct 2026.", createdAt: "2026-09-05T18:40:00+05:30", read: false, href: "/content/banners", source: "Admin Portal" },
  { id: "NTF-16", type: "Content", title: "3 banners are scheduled this week", body: "Bulk Order Savings, Dispatch SLA and Diwali Fuel Offer.", createdAt: "2026-09-06T09:00:00+05:30", read: true, href: "/content/banners", source: "Admin Portal" },
];

export const documents: PlatformDocument[] = [
  { id: "DOC-100", name: "GST Certificate — Apex Polymers", category: "GST", entity: "Apex Polymers Pvt Ltd", uploadedAt: "2026-01-09T10:10:00+05:30", status: "Verified", source: "Customer Web" },
  { id: "DOC-101", name: "PAN — Horizon Petrochem", category: "PAN", entity: "Horizon Petrochem", uploadedAt: "2026-09-04T19:51:00+05:30", status: "Pending", source: "Customer App" },
  { id: "DOC-102", name: "Cancelled cheque — SkyHigh", category: "Bank", entity: "SkyHigh Logistics", uploadedAt: "2026-09-04T18:52:00+05:30", status: "Revision Requested", source: "Seller Web" },
  { id: "DOC-103", name: "PO-8829-01", category: "Purchase Orders", entity: "Coastal Resins", uploadedAt: "2026-09-04T10:05:00+05:30", status: "Pending", source: "Admin Portal" },
  { id: "DOC-104", name: "Invoice INV-90021", category: "Invoices", entity: "Apex Polymers Pvt Ltd", uploadedAt: "2026-08-20T12:00:00+05:30", status: "Verified", source: "Seller Web" },
  { id: "DOC-105", name: "E-way bill SHP-4401", category: "E-way Bills", entity: "Global Energy Ltd.", uploadedAt: "2026-09-03T13:00:00+05:30", status: "Verified", source: "Seller App" },
  { id: "DOC-106", name: "POD SHP-4388", category: "Delivery Documents", entity: "Oriental Polymers", uploadedAt: "2026-08-30T12:20:00+05:30", status: "Verified", source: "Seller Web" },
  { id: "DOC-107", name: "KYC pack — Deccan Fuel", category: "KYC", entity: "Deccan Fuel Trading", uploadedAt: "2026-06-04T13:10:00+05:30", status: "Rejected", source: "Seller App" },
  { id: "DOC-108", name: "Insurance cover note — Delta", category: "Compliance", entity: "Delta Packaging Mills", uploadedAt: "2026-08-18T09:00:00+05:30", status: "Verified", source: "Admin Portal" },
];

export const auditLogs: AuditLog[] = [
  { id: "AUD-1", timestamp: "2026-09-05T07:42:00+05:30", admin: "Admin User", role: "SUPER_ADMIN", action: "Verified payment PAY-55101", module: "Payments", entity: "PAY-55101", result: "Success", source: "Admin Portal" },
  { id: "AUD-2", timestamp: "2026-09-04T18:10:00+05:30", admin: "Neha Kapoor", role: "COMPLIANCE", action: "Approved KYC for Apex Polymers", module: "KYC", entity: "KYC-840", result: "Success", source: "Admin Portal" },
  { id: "AUD-3", timestamp: "2026-09-01T13:20:00+05:30", admin: "Neha Kapoor", role: "COMPLIANCE", action: "Rejected offer OFF-7748", module: "Offers", entity: "OFF-7748", result: "Success", source: "Admin Portal" },
  { id: "AUD-4", timestamp: "2026-09-04T12:40:00+05:30", admin: "Amit Desai", role: "FINANCE", action: "Changed order PT-8966 to Ready for Dispatch", module: "Orders", entity: "PT-8966", result: "Success", source: "Admin Portal" },
  { id: "AUD-5", timestamp: "2026-08-27T09:40:00+05:30", admin: "Admin User", role: "SUPER_ADMIN", action: "Assigned dispute DSP-191", module: "Disputes", entity: "DSP-191", result: "Success", source: "Admin Portal" },
  { id: "AUD-6", timestamp: "2026-08-20T09:40:00+05:30", admin: "Amit Desai", role: "FINANCE", action: "Rejected KYC for Northline Chemicals", module: "KYC", entity: "KYC-833", result: "Success", source: "Admin Portal" },
  { id: "AUD-7", timestamp: "2026-09-05T18:40:00+05:30", admin: "Admin User", role: "SUPER_ADMIN", action: "Admin created banner Diwali Fuel Offer", module: "Content", entity: "BNR-1006", result: "Success", source: "Admin Portal" },
  { id: "AUD-8", timestamp: "2026-09-06T17:00:00+05:30", admin: "Amit Desai", role: "FINANCE", action: "Admin paused banner Settlement Reminder", module: "Content", entity: "BNR-1008", result: "Success", source: "Admin Portal" },
];
