#!/bin/bash

# ============================================
# CampusFlow Backend - API Testing Script
# Uses curl to test all endpoints
# ============================================

# Configuration
BASE_URL="http://localhost:5000"
TOKEN="YOUR_JWT_TOKEN_HERE"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CampusFlow API Testing ===${NC}\n"

# ============================================
# 1. HEALTH CHECK (No Auth)
# ============================================
echo -e "${GREEN}1. Testing Health Check${NC}"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo -e "\n"

# ============================================
# 2. CREATE STUDENT
# ============================================
echo -e "${GREEN}2. Creating Student${NC}"
STUDENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/students" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@university.edu"
  }')

echo "$STUDENT_RESPONSE" | python3 -m json.tool

# Extract student ID from response
STUDENT_ID=$(echo "$STUDENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo -e "Student ID: $STUDENT_ID\n"

# ============================================
# 3. LIST ALL STUDENTS
# ============================================
echo -e "${GREEN}3. Listing All Students${NC}"
curl -s "$BASE_URL/api/students" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "\n"

# ============================================
# 4. GET STUDENT BY ID
# ============================================
if [ ! -z "$STUDENT_ID" ]; then
  echo -e "${GREEN}4. Getting Student by ID${NC}"
  curl -s "$BASE_URL/api/students/$STUDENT_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
  echo -e "\n"
fi

# ============================================
# 5. CREATE CLASS
# ============================================
echo -e "${GREEN}5. Creating Class${NC}"
CLASS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Structures 101"
  }')

echo "$CLASS_RESPONSE" | python3 -m json.tool

# Extract class ID from response
CLASS_ID=$(echo "$CLASS_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo -e "Class ID: $CLASS_ID\n"

# ============================================
# 6. LIST ALL CLASSES
# ============================================
echo -e "${GREEN}6. Listing All Classes${NC}"
curl -s "$BASE_URL/api/classes" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "\n"

# ============================================
# 7. CREATE ENROLLMENT
# ============================================
if [ ! -z "$STUDENT_ID" ] && [ ! -z "$CLASS_ID" ]; then
  echo -e "${GREEN}7. Creating Enrollment${NC}"
  curl -s -X POST "$BASE_URL/api/enrollments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"studentId\": \"$STUDENT_ID\",
      \"classId\": \"$CLASS_ID\"
    }" | python3 -m json.tool
  echo -e "\n"
fi

# ============================================
# 8. GET ENROLLMENTS BY CLASS
# ============================================
if [ ! -z "$CLASS_ID" ]; then
  echo -e "${GREEN}8. Getting Enrollments by Class${NC}"
  curl -s "$BASE_URL/api/enrollments/class/$CLASS_ID" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
  echo -e "\n"
fi

# ============================================
# 9. GET CURRENT USER ROLE
# ============================================
echo -e "${GREEN}9. Getting Current User Role${NC}"
curl -s "$BASE_URL/api/roles/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "\n"

echo -e "${BLUE}=== Testing Complete ===${NC}"
