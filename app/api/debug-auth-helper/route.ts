import { NextResponse } from "next/server";
import { getServerAuthUser } from "@/lib/supabase/session";

export async function GET() {
  const user = await getServerAuthUser();

  return NextResponse.json({
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  });
}
