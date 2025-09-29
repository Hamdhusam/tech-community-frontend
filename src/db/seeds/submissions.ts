import { db } from '@/db';
import { submissions } from '@/db/schema';

async function main() {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sampleSubmissions = [
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: now.toISOString().split('T')[0],
            date: now.toISOString().split('T')[0],
            attendanceClass: 'Mathematics Advanced Level',
            fileAcademics: 'math_assignment_chapter_5.pdf',
            qdOfficial: 'Submitted final project presentation for peer review',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: yesterday.toISOString().split('T')[0],
            date: yesterday.toISOString().split('T')[0],
            attendanceClass: 'Computer Science Programming',
            fileAcademics: 'cs_project_backend_api.zip',
            qdOfficial: 'Completed backend API development with authentication system',
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            submissionDate: twoDaysAgo.toISOString().split('T')[0],
            date: twoDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Physics Laboratory Session',
            fileAcademics: 'physics_lab_report_optics.docx',
            qdOfficial: 'Conducted optics experiment and analyzed light refraction patterns',
            createdAt: twoDaysAgo.toISOString(),
            updatedAt: twoDaysAgo.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            submissionDate: threeDaysAgo.toISOString().split('T')[0],
            date: threeDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Chemistry Organic Compounds',
            fileAcademics: 'chemistry_synthesis_report.pdf',
            qdOfficial: 'Successfully synthesized organic compound and documented reaction mechanisms',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r7',
            submissionDate: threeDaysAgo.toISOString().split('T')[0],
            date: threeDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'English Literature Analysis',
            fileAcademics: 'literature_essay_shakespeare.docx',
            qdOfficial: 'Analyzed themes in Hamlet and submitted comparative essay on character development',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
        }
    ];

    await db.insert(submissions).values(sampleSubmissions);
    
    console.log('✅ Submissions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});