import { useBannerStore } from "@/store/banner-store";
import { useDataStore } from "@/store/data-store";
import { useGradeStore } from "@/store/grade-store";
import { useProcurementStore } from "@/store/procurement-store";
import { usePushNotificationStore } from "@/store/push-notification-store";

export interface SearchHit {
  id: string;
  group:
    | "Customers"
    | "Sellers"
    | "Procurement"
    | "Orders"
    | "Shipments"
    | "Products"
    | "Grades"
    | "Purchase Requests"
    | "Offers"
    | "Banners"
    | "Push Notifications";
  title: string;
  subtitle: string;
  href: string;
}

export function searchPlatform(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const state = useDataStore.getState();
  const hits: SearchHit[] = [];

  for (const item of state.customers) {
    if (`${item.id} ${item.company} ${item.contact} ${item.email}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Customers",
        title: item.company,
        subtitle: `${item.id} · ${item.location}`,
        href: `/customers?id=${item.id}`,
      });
    }
  }
  for (const item of state.sellers) {
    if (`${item.id} ${item.company} ${item.contact}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Sellers",
        title: item.company,
        subtitle: `${item.id} · ${item.location}`,
        href: `/sellers?id=${item.id}`,
      });
    }
  }
  for (const item of state.orders) {
    if (`${item.id} ${item.buyer} ${item.seller} ${item.grade}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Orders",
        title: item.id,
        subtitle: `${item.buyer} · ${item.grade}`,
        href: `/orders?id=${item.id}`,
      });
    }
  }
  for (const item of state.products) {
    if (`${item.grade} ${item.commodity} ${item.manufacturer} ${item.brand}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Products",
        title: item.grade,
        subtitle: `${item.commodity} · ${item.manufacturer}`,
        href: `/catalog?id=${item.id}`,
      });
    }
  }
  for (const item of useProcurementStore.getState().procurements) {
    if (
      `${item.id} ${item.poNumber ?? ""} ${item.commodity} ${item.grade} ${item.supplier} ${item.customerName} ${item.status} ${item.deliveryLocation}`
        .toLowerCase()
        .includes(q)
    ) {
      hits.push({
        id: item.id,
        group: "Procurement",
        title: item.poNumber ?? item.id,
        subtitle: `${item.commodity} · ${item.supplier} · ${item.status}`,
        href: `/procurement?id=${item.id}`,
      });
    }
  }
  for (const item of state.requests) {
    if (`${item.id} ${item.customer} ${item.grade}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Purchase Requests",
        title: item.id,
        subtitle: `${item.customer} · ${item.grade}`,
        href: `/procurement/requests?id=${item.id}`,
      });
    }
  }
  for (const item of state.shipments) {
    if (`${item.id} ${item.orderId} ${item.customer} ${item.vehicle}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Shipments",
        title: item.id,
        subtitle: `${item.orderId} · ${item.route}`,
        href: `/logistics?id=${item.id}`,
      });
    }
  }
  for (const item of state.offers) {
    if (`${item.id} ${item.seller} ${item.grade}`.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Offers",
        title: item.id,
        subtitle: `${item.seller} · ${item.grade}`,
        href: `/offers?id=${item.id}`,
      });
    }
  }
  for (const item of useBannerStore.getState().banners) {
    const haystack = `${item.name} ${item.campaignName} ${item.headline} ${item.platforms.join(" ")} ${item.placements.join(" ")}`;
    if (haystack.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Banners",
        title: item.name,
        subtitle: `${item.campaignName} · ${item.platforms.join(", ")}`,
        href: "/content/banners",
      });
    }
  }
  for (const item of useGradeStore.getState().grades) {
    const haystack = `${item.gradeCode} ${item.gradeName} ${item.categoryName} ${item.description ?? ""} ${item.applications.join(" ")}`;
    if (haystack.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Grades",
        title: item.gradeName,
        subtitle: `${item.gradeCode} · ${item.categoryName}`,
        href: `/master-data/grades/${item.id}`,
      });
    }
  }
  for (const item of usePushNotificationStore.getState().notifications) {
    const haystack = `${item.id} ${item.name} ${item.title} ${item.body} ${item.platforms.join(" ")}`;
    if (haystack.toLowerCase().includes(q)) {
      hits.push({
        id: item.id,
        group: "Push Notifications",
        title: item.title,
        subtitle: `${item.name} · ${item.platforms.join(", ")}`,
        href: "/content/push-notifications",
      });
    }
  }
  return hits.slice(0, 24);
}
