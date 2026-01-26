import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

export default function TeacherClassDetails() {
    const { classId } = useParams();
    const { profile } = useAuth();

    return (
        <CampusShell role="teacher" title="Class Details" user={{ name: profile?.firstName || "", role: "Teacher" }} notifications={[]}>
            <div className="space-y-6">
                <h2 className="text-2xl font-bold">Class {classId}</h2>
                <Tabs defaultValue="students">
                    <TabsList>
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        <TabsTrigger value="marks">Marks</TabsTrigger>
                    </TabsList>
                    <TabsContent value="students">Student List...</TabsContent>
                    <TabsContent value="attendance">Attendance View...</TabsContent>
                    <TabsContent value="marks">Marks View...</TabsContent>
                </Tabs>
            </div>
        </CampusShell>
    );
}
