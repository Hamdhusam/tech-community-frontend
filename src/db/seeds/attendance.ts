import { db } from '@/db';
import { attendance } from '@/db/schema';

async function main() {
    const sampleAttendance = [
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submittedAt: new Date('2024-12-15T09:15:00Z'),
            confirmedNotion: true,
            notes: 'Present for full session, actively participated'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            submittedAt: new Date('2024-12-14T08:45:00Z'),
            confirmedNotion: false,
            notes: 'Attended morning session only, left early for appointment'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            submittedAt: new Date('2024-12-13T10:30:00Z'),
            confirmedNotion: true,
            notes: 'Late arrival due to traffic, stayed after to catch up'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submittedAt: new Date('2024-12-12T09:00:00Z'),
            confirmedNotion: true,
            notes: 'Full attendance, completed all activities'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r7',
            submittedAt: new Date('2024-12-11T11:20:00Z'),
            confirmedNotion: false,
            notes: 'Attended virtually due to weather conditions'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r5',
            submittedAt: new Date('2024-12-10T09:30:00Z'),
            confirmedNotion: false,
            notes: 'Present but network issues affected participation'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r6',
            submittedAt: new Date('2024-12-09T08:15:00Z'),
            confirmedNotion: true,
            notes: 'Present for full session, actively participated'
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r7',
            submittedAt: new Date('2024-12-08T14:45:00Z'),
            confirmedNotion: true,
            notes: 'Full attendance, completed all activities'
        }
    ];

    await db.insert(attendance).values(sampleAttendance);
    
    console.log('✅ Attendance seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});