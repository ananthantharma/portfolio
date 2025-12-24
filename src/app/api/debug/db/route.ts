import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import NoteSection from '@/models/NoteSection';
import { INoteCategory } from '@/models/NoteCategory';

export async function GET() {
    await dbConnect();

    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        // Check counts
        const categoryCount = await NoteCategory.countDocuments({});
        const sectionCount = await NoteSection.countDocuments({});

        // Fetch a sample category
        const sampleCategory = await NoteCategory.findOne({}).lean();

        return NextResponse.json({
            status: 'ok',
            dbName: mongoose.connection.db.databaseName,
            collections: collectionNames,
            counts: {
                categories: categoryCount,
                sections: sectionCount
            },
            sampleCategory,
            envUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
