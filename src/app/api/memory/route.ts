import { NextRequest, NextResponse } from "next/server";
import { getUserMemory, batchSetUserMemory, deleteUserMemory } from "@/server/services/userMemory.service";
import { createClient } from "@/server/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memory = await getUserMemory(user.id);
    return NextResponse.json(memory);
  } catch (error) {
    console.error("[API] Failed to get user memory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid entries" }, { status: 400 });
    }

    const saved = await batchSetUserMemory(user.id, entries);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[API] Failed to save user memory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    await deleteUserMemory(user.id, key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to delete user memory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
