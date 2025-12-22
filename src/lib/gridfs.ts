import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dbConnect from './dbConnect';

let bucket: GridFSBucket;

export async function getGridFSBucket() {
    if (bucket) return bucket;

    await dbConnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (mongoose.connection.db as any);
    bucket = new GridFSBucket(db, { bucketName: 'attachments' });
    return bucket;
}

export async function uploadFileToGridFS(file: File | Blob, filename: string, contentType: string): Promise<string> {
    const bucket = await getGridFSBucket();
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadStream = bucket.openUploadStream(filename, {
        contentType: contentType,
    });

    return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
            resolve(uploadStream.id.toString());
        });

        uploadStream.on('error', (error) => {
            reject(error);
        });

        uploadStream.end(buffer);
    });
}

export async function deleteFileFromGridFS(fileId: string): Promise<void> {
    const bucket = await getGridFSBucket();
    return bucket.delete(new mongoose.Types.ObjectId(fileId));
}

export async function getFileStream(fileId: string) {
    const bucket = await getGridFSBucket();
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}
