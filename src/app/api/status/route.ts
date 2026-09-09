import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/upstream";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = cacheStats();

  return NextResponse.json({
    status: "healthy",
    cache: stats,
    timestamp: new Date().toISOString(),
  }, {
    status: 200
  });
}