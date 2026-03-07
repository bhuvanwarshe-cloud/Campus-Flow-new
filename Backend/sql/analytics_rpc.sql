CREATE OR REPLACE FUNCTION get_class_analytics_for_teacher(
    p_class_id UUID, 
    p_teacher_id UUID
) 
RETURNS JSON AS $$
DECLARE
    v_total_students INT;
    v_attendance_percentage NUMERIC;
    v_class_average NUMERIC;
    v_mark_distribution JSON;
    v_top_students JSON;
    v_bottom_students JSON;
BEGIN
    -------------------------------------------------------------------------
    -- 1. Total Enrolled Students (Only 'approved')
    -------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_total_students
    FROM student_class_enrollments
    WHERE class_id = p_class_id AND status = 'approved';

    -------------------------------------------------------------------------
    -- 2. Class Average Attendance (%) for this exact Teacher & Class
    -------------------------------------------------------------------------
    SELECT 
        COALESCE(
            ROUND(
                (SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::NUMERIC / 
                NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
            2), 
        0) INTO v_attendance_percentage
    FROM attendance
    WHERE class_id = p_class_id AND teacher_id = p_teacher_id;

    -------------------------------------------------------------------------
    -- 3. Marks Distribution & Average (Bucketing via FILTER)
    -------------------------------------------------------------------------
    -- Note: Assuming Marks are out of 100, or we normalize them to percentages first.
    -- For this logic, we calculate the percentage score: (score / max_score) * 100
    WITH PercentageScores AS (
        SELECT 
            m.student_id,
            ((m.score / m.max_score) * 100) AS percent_score
        FROM marks m
        JOIN assignments a ON m.assignment_id = a.id
        WHERE a.class_id = p_class_id AND m.teacher_id = p_teacher_id
    )
    SELECT 
        COALESCE(ROUND(AVG(percent_score), 2), 0),
        json_build_object(
            '0_40',  COUNT(*) FILTER (WHERE percent_score <= 40),
            '41_60', COUNT(*) FILTER (WHERE percent_score > 40 AND percent_score <= 60),
            '61_80', COUNT(*) FILTER (WHERE percent_score > 60 AND percent_score <= 80),
            '81_100',COUNT(*) FILTER (WHERE percent_score > 80)
        ) 
    INTO v_class_average, v_mark_distribution
    FROM PercentageScores;

    -------------------------------------------------------------------------
    -- 4. Top 5 & Bottom 5 Students (Based on Average Marks)
    -------------------------------------------------------------------------
    WITH StudentAverages AS (
        SELECT 
            m.student_id,
            p.full_name,
            ROUND(AVG((m.score / m.max_score) * 100), 2) AS avg_percent
        FROM marks m
        JOIN assignments a ON m.assignment_id = a.id
        JOIN profiles p ON m.student_id = p.id
        WHERE a.class_id = p_class_id AND m.teacher_id = p_teacher_id
        GROUP BY m.student_id, p.full_name
    )
    SELECT 
        (
            SELECT json_agg(row_to_json(t)) 
            FROM (SELECT full_name, avg_percent FROM StudentAverages ORDER BY avg_percent DESC LIMIT 5) t
        ),
        (
            SELECT json_agg(row_to_json(b)) 
            FROM (SELECT full_name, avg_percent FROM StudentAverages ORDER BY avg_percent ASC LIMIT 5) b
        ) 
    INTO v_top_students, v_bottom_students;

    -------------------------------------------------------------------------
    -- 5. Construct Final JSON Payload
    -------------------------------------------------------------------------
    RETURN json_build_object(
        'metrics', json_build_object(
            'totalStudents', v_total_students,
            'attendanceRate', v_attendance_percentage,
            'classAverage', v_class_average
        ),
        'distribution', v_mark_distribution,
        'performance', json_build_object(
            'topStudents', COALESCE(v_top_students, '[]'::json),
            'bottomStudents', COALESCE(v_bottom_students, '[]'::json)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
