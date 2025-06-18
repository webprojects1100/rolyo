import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/lib/supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function addSubscription(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from("subscriptions").insert({ email });

    if (error) {
      if (error.code === "23505") {
        return { success: false, message: "This email is already subscribed." };
      }
      return {
        success: false,
        message: `An error occurred: ${error.message || error}`,
      };
    }

    return { success: true, message: "Thank you for subscribing!" };
  } catch {
    return { success: false, message: "An unexpected error occurred." };
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("id", userId)
    .single();
  return !!data && !error;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
