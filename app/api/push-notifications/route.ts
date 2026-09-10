import { NextResponse } from "next/server";

import { getInboxPayloads, getPushesSync, upsertSentPush } from "@/lib/api/push-notifications";
import { matchesPushFilters, sortPushes, toPublicPayload } from "@/lib/push-notification-utils";
import { EMPTY_PUSH_FILTERS, type PushNotification, type PushStatus } from "@/types/push-notification";

/**
 * Push notification consumption API for Customer / Seller APP + WEBAPP.
 *
 * Customer inbox:
 *   GET /api/push-notifications?audience=customer&status=SENT
 *
 * Seller inbox:
 *   GET /api/push-notifications?audience=seller&status=SENT
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));
  const status = parseStatus(searchParams.get("status"));

  if (audience && (status === "SENT" || status == null)) {
    return corsJson({ data: getInboxPayloads(audience) });
  }

  const items = getPushesSync().filter((item) =>
    matchesPushFilters(item, {
      ...EMPTY_PUSH_FILTERS,
      audience: audience ?? "ALL",
      status: status ?? "ALL",
    }),
  );

  return corsJson({
    data: sortPushes(items).map((item) =>
      toPublicPayload(item, audience ?? (item.platforms.some((p) => p.startsWith("CUSTOMER")) ? "CUSTOMER" : "SELLER")),
    ),
  });
}

export async function POST(request: Request) {
  const item = (await request.json()) as PushNotification;
  if (!item?.id || !item.title) {
    return corsJson({ error: "Invalid push notification payload." }, 400);
  }
  const saved = upsertSentPush(item);
  return corsJson({ data: saved });
}

export function OPTIONS() {
  return corsJson({});
}

function corsJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function parseAudience(value: string | null): "CUSTOMER" | "SELLER" | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === "CUSTOMER") return "CUSTOMER";
  if (normalized === "SELLER") return "SELLER";
  return null;
}

function parseStatus(value: string | null): PushStatus | null {
  if (
    value === "DRAFT" ||
    value === "SCHEDULED" ||
    value === "SENT" ||
    value === "FAILED" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return null;
}
