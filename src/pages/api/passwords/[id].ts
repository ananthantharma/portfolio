import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import Password from "../../../models/Password"
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user?.email) {
        return res.status(401).json({ error: "Not authenticated" })
    }

    const { id } = req.query;

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI as string);
    }

    if (req.method === 'PUT') {
        try {
            const { title, site, username, password, notes } = req.body;
            const updatedPassword = await Password.findOneAndUpdate(
                { _id: id, userEmail: session.user.email },
                { title, site, username, password, notes },
                { new: true }
            );

            if (!updatedPassword) {
                return res.status(404).json({ error: "Password not found" });
            }

            return res.status(200).json(updatedPassword);
        } catch (error) {
            return res.status(500).json({ error: "Failed to update password" });
        }
    } else if (req.method === 'DELETE') {
        try {
            const deletedPassword = await Password.findOneAndDelete({ _id: id, userEmail: session.user.email });

            if (!deletedPassword) {
                return res.status(404).json({ error: "Password not found" });
            }

            return res.status(200).json({ message: "Password deleted" });
        } catch (error) {
            return res.status(500).json({ error: "Failed to delete password" });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
