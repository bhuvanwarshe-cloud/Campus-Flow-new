
import { supabaseAdmin } from "./src/config/supabase.js";

async function debugRequests() {
  console.log("--- Debugging Teacher Assignments & Student Requests ---");

  // 1. Get all teacher assignments
  const { data: assignments, error: assignError } = await supabaseAdmin
    .from("teacher_classes")
    .select("*");
  
  if (assignError) {
    console.error("Error fetching assignments:", assignError);
  } else {
    console.log(`\nTeacher Assignments (${assignments.length}):`);
    for (const a of assignments) {
        const { data: cls } = await supabaseAdmin.from("classes").select("name").eq("id", a.class_id).maybeSingle();
        const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("user_id", a.teacher_id).maybeSingle();
        console.log(`- Teacher: ${prof?.full_name || 'N/A'} (ID: ${a.teacher_id})`);
        console.log(`  Class: ${cls?.name || 'N/A'} (ID: ${a.class_id})`);
        console.log(`  Is Class Teacher: ${a.is_class_teacher}`);
    }
  }

  // 2. Get all pending student join requests
  const { data: requests, error: reqError } = await supabaseAdmin
    .from("student_join_requests")
    .select("*")
    .eq("status", "pending");

  if (reqError) {
    console.error("Error fetching requests:", reqError);
  } else {
    console.log(`\nPending Student Join Requests (${requests.length}):`);
    for (const r of requests) {
        // Try both user_id and id
        const { data: profById } = await supabaseAdmin.from("profiles").select("*").eq("id", r.user_id).maybeSingle();
        const { data: profByUserId } = await supabaseAdmin.from("profiles").select("*").eq("user_id", r.user_id).maybeSingle();
        
        console.log(`- Request ID: ${r.id}, Student Auth ID: ${r.user_id}`);
        if (profById) {
            console.log(`  Profile found by 'id': ${profById.full_name || profById.first_name + ' ' + profById.last_name}`);
            console.log(`  Profile 'id' value: ${profById.id}, 'user_id' value: ${profById.user_id}`);
        } else {
            console.log(`  Profile NOT found by 'id'`);
        }
        
        if (profByUserId) {
            console.log(`  Profile found by 'user_id': ${profByUserId.full_name || profByUserId.first_name + ' ' + profByUserId.last_name}`);
        } else {
            console.log(`  Profile NOT found by 'user_id'`);
        }
        
        const { data: cls } = await supabaseAdmin.from("classes").select("name").eq("id", r.class_id).maybeSingle();
        console.log(`  Class: ${cls?.name || 'N/A'} (ID: ${r.class_id})`);
        console.log(`  Status: ${r.status}`);
    }
  }

  // 3. Get notifications for the teacher
  const teacherId = '85a6decb-8532-4b80-b0ae-dd75df30d3ad';
  const { data: notifs, error: notifError } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", teacherId)
    .order("created_at", { ascending: false });

  if (notifError) {
    console.error("Error fetching notifications:", notifError);
  } else {
    console.log(`\nNotifications for Teacher (${notifs.length}):`);
    for (const n of notifs) {
        console.log(`- Title: ${n.title}, Message: ${n.message}, Created At: ${n.created_at}, Is Read: ${n.is_read}`);
    }
  }

  console.log("\n--- Debugging End ---");
}

debugRequests();
