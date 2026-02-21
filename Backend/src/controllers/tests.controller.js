import { supabase as supabaseAdmin } from "../config/supabase.js";
import { AppError, asyncHandler } from "../utils/errorHandler.js";
import supabaseService from "../services/supabase.service.js";
import { getSupabaseClient } from "../utils/supabase.client.js";
import { sendClassNotification } from "../utils/notifications.js";

// ============================================
// HELPERS
// ============================================

const ensureTeacher = async (userId) => {
    const role = await supabaseService.getUserRole(userId);
    if (role !== "teacher" && role !== "admin") {
        throw new AppError(`Access denied. Teacher or Admin role required. (Current role: ${role || 'None'})`, 403);
    }
    return role;
};

const resolveStudent = async (req) => {
    const userId = req.user.id;
    const userEmail = req.user.email?.trim();
    const supabase = getSupabaseClient(req.user.token);

    const role = await supabaseService.getUserRole(userId);
    // Allow admin to bypass student role check for viewing
    if (role !== "student" && role !== "admin") {
        throw new AppError(`Access denied. Student role required. (Current role: ${role || 'None'})`, 403);
    }

    const { data: students, error } = await supabase
        .from("students")
        .select("id, email")
        .ilike("email", userEmail)
        .limit(1);

    if (error) throw new AppError(`Failed to resolve student: ${error.message}`, 500);
    if (!students || students.length === 0) {
        throw new AppError("Student record not found.", 404);
    }

    return { studentId: students[0].id, email: students[0].email };
};

// ============================================
// TEACHER ACTIONS
// ============================================

/**
 * Create a new MCQ Test
 * POST /api/teacher/tests
 */
export const createTest = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { title, classId, duration, startDate, endDate, createdBy } = req.body;

    // Defense validation
    if (createdBy && createdBy !== userId) {
        throw new AppError("Security Violation: You can only create tests as yourself.", 403);
    }

    if (!title || !classId || !duration || !startDate || !endDate) {
        throw new AppError("All fields are required", 400);
    }

    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("mcq_tests")
        .insert([{
            title,
            class_id: classId,
            duration,
            start_date: startDate,
            end_date: endDate,
            created_by: userId
        }])
        .select()
        .single();

    if (error) {
        if (error.code === "42501") throw new AppError("Forbidden: RLS Policy Violation.", 403);
        throw new AppError(error.message, 500);
    }

    // Notify students
    await sendClassNotification({
        classId,
        title: "New MCQ Test",
        message: `A new test "${title}" has been scheduled for your class.`,
        type: "test",
        link: "/student/tests"
    });

    res.status(201).json({
        success: true,
        data,
        message: "Test created successfully"
    });
});

/**
 * Add questions to a test
 * POST /api/teacher/tests/:id/questions
 */
export const addQuestions = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { id } = req.params;
    const { questions } = req.body; // Array of { question, options, correct_answer }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        throw new AppError("Questions array is required", 400);
    }

    const supabase = getSupabaseClient(req.user.token);

    // Verify test ownership
    const { data: test } = await supabase
        .from("mcq_tests")
        .select("created_by")
        .eq("id", id)
        .single();

    if (!test || test.created_by !== userId) {
        throw new AppError("Not authorized to modify this test (RLS)", 403);
    }

    const questionsData = questions.map(q => ({
        test_id: id,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer
    }));

    const { data, error } = await supabase
        .from("mcq_questions")
        .insert(questionsData)
        .select();

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    // Notify students that the test is published/updated
    const { data: testDetails } = await supabase
        .from("mcq_tests")
        .select("title, class_id")
        .eq("id", id)
        .single();

    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", testDetails.class_id);

    if (enrollments) {
        for (const enrollment of enrollments) {
            await supabase.from("notifications").insert([{
                user_id: enrollment.student_id,
                title: "New Test Published",
                message: `${testDetails.title} is now available.`,
                is_read: false
            }]);
        }
    }

    res.status(201).json({
        success: true,
        data,
        message: "Questions added successfully"
    });
});

/**
 * Get results for a test
 * GET /api/teacher/tests/:id/results
 */
export const getTestResults = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);

    const { id } = req.params;
    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("mcq_submissions")
        .select(`
            *,
            students (name, email)
        `)
        .eq("test_id", id)
        .order("score", { ascending: false });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * Get tests created by the current teacher
 * GET /api/tests/teacher
 */
export const getTeacherTests = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    await ensureTeacher(userId);
    const supabase = getSupabaseClient(req.user.token);

    const { data, error } = await supabase
        .from("mcq_tests")
        .select(`
            *,
            classes (name)
        `)
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data
    });
});

// ============================================
// STUDENT ACTIONS
// ============================================

/**
 * Get tests for current student
 * GET /api/student/tests
 */
export const getStudentTests = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);
    const supabase = getSupabaseClient(req.user.token);

    // Get classes student is enrolled in
    const { data: enrollments } = await supabase
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId);

    const classIds = enrollments?.map(e => e.class_id) || [];

    if (classIds.length === 0) {
        return res.status(200).json({ success: true, data: [] });
    }

    const { data, error } = await supabase
        .from("mcq_tests")
        .select(`
            *,
            classes (name),
            mcq_submissions (id, score, submitted_at, student_id)
        `)
        .in("class_id", classIds)
        .order("start_date", { ascending: true });

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    const result = data.map(test => {
        const submission = test.mcq_submissions.find(s => s.student_id === studentId);
        const { mcq_submissions, ...rest } = test;
        return {
            ...rest,
            submission: submission || null
        };
    });

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Get individual test questions (for taking the test)
 * GET /api/student/tests/:id
 */
export const getTestQuestions = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);
    const { id } = req.params;
    const supabase = getSupabaseClient(req.user.token);

    // Verify test availability
    const { data: test, error: testErr } = await supabase
        .from("mcq_tests")
        .select("*")
        .eq("id", id)
        .single();

    if (testErr || !test) throw new AppError("Test not found or access denied", 404);

    const now = new Date();
    if (now < new Date(test.start_date)) throw new AppError("Test has not started yet", 400);
    if (now > new Date(test.end_date)) throw new AppError("Test has ended", 400);

    // Check for previous submission
    const { data: existingSub } = await supabase
        .from("mcq_submissions")
        .select("id")
        .eq("test_id", id)
        .eq("student_id", studentId)
        .maybeSingle();

    if (existingSub) throw new AppError("You have already submitted this test", 400);

    const { data: questions, error } = await supabase
        .from("mcq_questions")
        .select("id, question, options")
        .eq("test_id", id);

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(200).json({
        success: true,
        data: {
            test,
            questions
        }
    });
});

/**
 * Submit MCQ Test
 * POST /api/student/tests/:id/submit
 */
export const submitTest = asyncHandler(async (req, res) => {
    const { studentId } = await resolveStudent(req);
    const { id } = req.params;
    const { answers } = req.body; // Map of question_id -> selected_option
    const supabase = getSupabaseClient(req.user.token);

    if (!answers) throw new AppError("Answers are required", 400);

    // Get correct answers
    const { data: questions, error: qErr } = await supabase
        .from("mcq_questions")
        .select("id, correct_answer")
        .eq("test_id", id);

    if (qErr) {
        if (qErr.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(qErr.message, 500);
    }

    // Calculate score
    let score = 0;
    questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
            score++;
        }
    });

    // Save submission
    const { data, error } = await supabase
        .from("mcq_submissions")
        .upsert([{
            test_id: id,
            student_id: studentId,
            answers,
            score,
            submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        if (error.code === "42501") throw new AppError("Access Denied (RLS)", 403);
        throw new AppError(error.message, 500);
    }

    res.status(201).json({
        success: true,
        data,
        message: `Test submitted. Your score: ${score}/${questions.length}`
    });
});
