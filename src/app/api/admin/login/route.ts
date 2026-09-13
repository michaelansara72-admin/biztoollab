import { NextRequest, NextResponse } from "next/server";

import {
  adminSessionCookie,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const password =
      typeof body?.password === "string" ? body.password : "";

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credentials.",
        },
        {
          status: 401,
        }
      );
    }

    const sessionToken = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: adminSessionCookie.name,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/admin",
      maxAge: adminSessionCookie.maxAge,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process login.",
      },
      {
        status: 400,
      }
    );
  }
}