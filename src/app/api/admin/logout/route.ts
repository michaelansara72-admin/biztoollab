import { NextResponse } from "next/server";

import { adminSessionCookie } from "@/lib/adminAuth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: adminSessionCookie.name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });

  return response;
}