import { useState, useEffect } from "react";
import { CampusShell } from "@/components/campusflow/CampusShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

export default function TeacherMarks() {
    const { profile } = useAuth();

    return (
        <CampusShell role="teacher" title="Marks Management" user={{ name: profile?.firstName || "", role: "Teacher" }} notifications={[]}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Marks</CardTitle>
                        <CardDescription>Select class and exam to upload marks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Module under construction. Requires exam configuration first.</p>
                    </CardContent>
                </Card>
            </div>
        </CampusShell>
    );
}
