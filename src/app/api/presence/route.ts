import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Simple presence API to update user's online status
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update user's last active timestamp in Supabase
    await supabase
      .from('profiles')
      .update({
        last_active: new Date().toISOString(),
        status: 'ONLINE'
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating presence:", error);
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    );
  }
}