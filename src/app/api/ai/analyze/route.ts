import { NextRequest } from "next/server";

import { handleAnalyzeRequest } from "@/lib/ai/handleAnalyzeRequest";

export async function POST(request: NextRequest) {
  return handleAnalyzeRequest(request);
}
