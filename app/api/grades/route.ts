import { NextResponse } from "next/server";

import { getGradesSync, getCustomerVisibleGrades, getSellerVisibleGrades } from "@/lib/api/grades";
import { matchesGradeFilters, sortGrades, toPublicGrade } from "@/lib/grade-utils";
import { DEFAULT_GRADE_SORT, EMPTY_GRADE_FILTERS, type GradeStatus } from "@/types/grade";

/**
 * Grade Master consumption API.
 *
 * Customer marketplace:
 *   GET /api/grades?customerVisible=true&status=ACTIVE
 *
 * Seller marketplace / offer creation:
 *   GET /api/grades?sellerVisible=true&status=ACTIVE
 *
 * Blind marketplace: responses never include seller identity.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerVisible = parseBool(searchParams.get("customerVisible"));
  const sellerVisible = parseBool(searchParams.get("sellerVisible"));
  const status = parseStatus(searchParams.get("status"));
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "ALL";

  if (customerVisible === true && status === "ACTIVE" && sellerVisible == null && !search && categoryId === "ALL") {
    return NextResponse.json({ data: await getCustomerVisibleGrades() });
  }
  if (sellerVisible === true && status === "ACTIVE" && customerVisible == null && !search && categoryId === "ALL") {
    return NextResponse.json({ data: await getSellerVisibleGrades() });
  }

  const grades = getGradesSync().filter((item) =>
    matchesGradeFilters(item, {
      ...EMPTY_GRADE_FILTERS,
      search,
      categoryId: categoryId === "ALL" ? "ALL" : categoryId,
      status: status ?? "ALL",
      customerVisible: customerVisible == null ? "ALL" : customerVisible ? "VISIBLE" : "HIDDEN",
      sellerVisible: sellerVisible == null ? "ALL" : sellerVisible ? "VISIBLE" : "HIDDEN",
    }),
  );

  return NextResponse.json({
    data: sortGrades(grades, DEFAULT_GRADE_SORT).map(toPublicGrade),
  });
}

function parseBool(value: string | null) {
  if (value == null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseStatus(value: string | null): GradeStatus | null {
  if (value === "ACTIVE" || value === "INACTIVE") return value;
  return null;
}
