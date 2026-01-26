#!/bin/bash

# ============================================
# CampusFlow Marks API - Testing Script
# Tests all marks-related endpoints
# ============================================

BASE_URL="http://localhost:5000"

# Replace with actual tokens from Supabase
ADMIN_TOKEN="YOUR_ADMIN_JWT_TOKEN"
TEACHER_TOKEN="YOUR_TEACHER_JWT_TOKEN"
STUDENT_TOKEN="YOUR_STUDENT_JWT_TOKEN"

# Test IDs (replace with actual IDs)
STUDENT_ID="student-uuid"
SUBJECT_ID="subject-uuid"
EXAM_ID="exam-uuid"
CLASS_ID="class-uuid"
MARK_ID="mark-uuid"

echo "============================================"
echo "CampusFlow Marks API - Testing"
echo "============================================"
echo ""

# ============================================
# 1. TEACHER UPLOADS MARKS
# ============================================
echo "1️⃣  Teacher uploads marks for student"
curl -X POST "$BASE_URL/api/marks" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": \"$STUDENT_ID\",
    \"subject_id\": \"$SUBJECT_ID\",
    \"exam_id\": \"$EXAM_ID\",
    \"marks_obtained\": 85
  }" | python3 -m json.tool
echo ""

# ============================================
# 2. STUDENT VIEWS OWN MARKS
# ============================================
echo "2️⃣  Student views their own marks"
curl "$BASE_URL/api/marks/me" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | python3 -m json.tool
echo ""

# ============================================
# 3. TEACHER VIEWS CLASS MARKS
# ============================================
echo "3️⃣  Teacher views all marks for their class"
curl "$BASE_URL/api/marks/class/$CLASS_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | python3 -m json.tool
echo ""

# ============================================
# 4. TEACHER VIEWS EXAM MARKS
# ============================================
echo "4️⃣  Teacher views all marks for an exam"
curl "$BASE_URL/api/marks/exam/$EXAM_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | python3 -m json.tool
echo ""

# ============================================
# 5. UPDATE MARKS
# ============================================
echo "5️⃣  Teacher updates marks"
curl -X PUT "$BASE_URL/api/marks/$MARK_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"marks_obtained\": 90
  }" | python3 -m json.tool
echo ""

# ============================================
# 6. AUTHORIZATION TEST - Student tries to view class marks (should fail)
# ============================================
echo "6️⃣  Student tries to view class marks (should be 403 Forbidden)"
curl "$BASE_URL/api/marks/class/$CLASS_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | python3 -m json.tool
echo ""

# ============================================
# 7. AUTHORIZATION TEST - Teacher views marks for class they're not assigned
# ============================================
echo "7️⃣  Teacher tries to view marks for class they're not assigned (should be 403)"
curl "$BASE_URL/api/marks/class/$CLASS_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" | python3 -m json.tool
echo ""

# ============================================
# 8. VALIDATION TEST - Marks exceed max_marks (should fail)
# ============================================
echo "8️⃣  Try to upload marks exceeding max_marks (should be 400)"
curl -X POST "$BASE_URL/api/marks" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": \"$STUDENT_ID\",
    \"subject_id\": \"$SUBJECT_ID\",
    \"exam_id\": \"$EXAM_ID\",
    \"marks_obtained\": 150
  }" | python3 -m json.tool
echo ""

# ============================================
# 9. DUPLICATE CHECK - Upload same marks twice (should fail)
# ============================================
echo "9️⃣  Try to upload marks twice for same student-subject-exam (should be 409)"
curl -X POST "$BASE_URL/api/marks" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"student_id\": \"$STUDENT_ID\",
    \"subject_id\": \"$SUBJECT_ID\",
    \"exam_id\": \"$EXAM_ID\",
    \"marks_obtained\": 75
  }" | python3 -m json.tool
echo ""

# ============================================
# 10. ADMIN VIEWS ALL MARKS
# ============================================
echo "🔟 Admin views all marks for a class"
curl "$BASE_URL/api/marks/class/$CLASS_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
echo ""

echo "============================================"
echo "Testing Complete!"
echo "============================================"
