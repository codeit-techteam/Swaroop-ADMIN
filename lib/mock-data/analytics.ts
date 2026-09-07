export const revenueSeries = [
  { label: "D-29", revenue: 38, orders: 210, gmv: 52 },
  { label: "D-24", revenue: 41, orders: 224, gmv: 58 },
  { label: "D-19", revenue: 36, orders: 198, gmv: 49 },
  { label: "D-14", revenue: 48, orders: 260, gmv: 66 },
  { label: "D-9", revenue: 52, orders: 274, gmv: 71 },
  { label: "D-4", revenue: 47, orders: 251, gmv: 64 },
  { label: "Today", revenue: 61, orders: 318, gmv: 82 },
];

export const creditRiskExposure = [
  {
    name: "Low",
    label: "Low risk",
    value: 75,
    amount: 18_000_000,
    color: "#059669",
    hint: "Performing accounts",
  },
  {
    name: "Medium",
    label: "Medium risk",
    value: 15,
    amount: 3_600_000,
    color: "#D97706",
    hint: "Watch closely",
  },
  {
    name: "High",
    label: "High risk",
    value: 10,
    amount: 2_400_000,
    color: "#DC2626",
    hint: "Needs action",
  },
];

export const categoryDistribution = [
  { name: "PP", value: 34 },
  { name: "PVC", value: 22 },
  { name: "HDPE", value: 16 },
  { name: "Fuels", value: 18 },
  { name: "Crude", value: 10 },
];

export const regionalDistribution = [
  { name: "West", value: 41 },
  { name: "North", value: 24 },
  { name: "South", value: 21 },
  { name: "East", value: 14 },
];

export const buyerGrowth = [
  { label: "May", buyers: 980, sellers: 310 },
  { label: "Jun", buyers: 1060, sellers: 348 },
  { label: "Jul", buyers: 1144, sellers: 390 },
  { label: "Aug", buyers: 1220, sellers: 428 },
  { label: "Sep", buyers: 1284, sellers: 452 },
];

export const ecosystemOverview = [
  { id: "customer-app", name: "Customer App", metricLabel: "Active Users", metric: 4821, secondaryLabel: "Orders Today", secondary: 142, href: "/customers", status: "Operational" as const },
  { id: "customer-web", name: "Customer Web", metricLabel: "Active Users", metric: 2143, secondaryLabel: "Orders Today", secondary: 87, href: "/customers", status: "Operational" as const },
  { id: "seller-app", name: "Seller App", metricLabel: "Active Sellers", metric: 312, secondaryLabel: "Offers Today", secondary: 86, href: "/sellers", status: "Operational" as const },
  { id: "seller-web", name: "Seller Web", metricLabel: "Active Sellers", metric: 140, secondaryLabel: "Offers Today", secondary: 54, href: "/sellers", status: "Operational" as const },
];

export const platformHealth = [
  { name: "Customer App", status: "Operational" as const },
  { name: "Customer Web", status: "Operational" as const },
  { name: "Seller App", status: "Operational" as const },
  { name: "Seller Web", status: "Operational" as const },
  { name: "Payment Gateway", status: "Operational" as const },
  { name: "Notification Service", status: "Operational" as const },
];
