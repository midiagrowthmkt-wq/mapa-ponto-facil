import { supabase } from "@/integrations/supabase/client";

export const createAdminUser = async (email: string) => {
  try {
    // Get user ID from email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", email)
      .single();

    if (!profile) {
      throw new Error("User not found");
    }

    // Add admin role
    const { error } = await supabase
      .from("user_roles")
      .insert({
        user_id: profile.id,
        role: "admin",
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error creating admin user:", error);
    return { success: false, error };
  }
};

export const checkUserRole = async (userId: string, role: "admin" | "employee") => {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", role)
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    return false;
  }
};
