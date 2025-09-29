import { db } from '@/db';
import { votes } from '@/db/schema';

async function main() {
    const sampleVotes = [
        {
            userId: 'user_archanaarchu200604',
            voteDate: '2024-12-16',
            vote: 'yes',
            createdAt: new Date('2024-12-16T09:30:00Z').toISOString(),
            updatedAt: new Date('2024-12-16T09:30:00Z').toISOString(),
        },
        {
            userId: 'user_archanaarchu200604',
            voteDate: '2024-12-17',
            vote: 'no',
            createdAt: new Date('2024-12-17T14:15:00Z').toISOString(),
            updatedAt: new Date('2024-12-17T14:15:00Z').toISOString(),
        },
        {
            userId: 'user_archanaarchu200604',
            voteDate: '2024-12-18',
            vote: 'abstain',
            createdAt: new Date('2024-12-18T11:45:00Z').toISOString(),
            updatedAt: new Date('2024-12-18T11:45:00Z').toISOString(),
        },
        {
            userId: 'user_archanaarchu200604',
            voteDate: '2024-12-19',
            vote: 'approve',
            createdAt: new Date('2024-12-19T16:20:00Z').toISOString(),
            updatedAt: new Date('2024-12-19T16:20:00Z').toISOString(),
        },
        {
            userId: 'user_archanaarchu200604',
            voteDate: '2024-12-20',
            vote: 'reject',
            createdAt: new Date('2024-12-20T10:00:00Z').toISOString(),
            updatedAt: new Date('2024-12-20T10:00:00Z').toISOString(),
        },
    ];

    await db.insert(votes).values(sampleVotes);
    
    console.log('✅ Votes seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});