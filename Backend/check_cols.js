
import { supabaseAdmin } from "./src/config/supabase.js";

async function checkColumns() {
  console.log("--- Checking Table Columns ---");

  // Check profiles table
  const { data: profiles, error: pError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .limit(1);
  
  if (pError) {
    console.error("Error fetching profiles:", pError);
  } else {
    console.log("Profiles columns:", profiles.length > 0 ? Object.keys(profiles[0]) : "No rows found");
  }

  // Check student_join_requests table
  const { data: sjr, error: sjrError } = await supabaseAdmin
    .from("student_join_requests")
    .select("*")
    .limit(1);

  if (sjrError) {
    console.error("Error fetching student_join_requests:", sjrError);
  } else {
    console.log("student_join_requests columns:", sjr.length > 0 ? Object.keys(sjr[0]) : "No rows found");
  }

  console.log("\n--- Check End ---");
}

checkColumns();
