import { NextRequest } from "next/server";
import { handleAdminLogin } from "@/lib/handleAdminLogin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleAdminLogin(request);
}
