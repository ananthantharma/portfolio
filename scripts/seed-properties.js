const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const PropertySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        address: { type: String, required: true },
        type: { type: String, enum: ['Primary Residence', 'Rental'], required: true },
    },
    { timestamps: true }
);

const Property = mongoose.models.Property || mongoose.model('Property', PropertySchema);

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const properties = [
            {
                name: '197 Randall',
                address: '197 Randall Ave, Markham, ON',
                type: 'Primary Residence',
            },
            {
                name: '89 Laing',
                address: '89 Laing Dr, Toronto, ON',
                type: 'Rental',
            },
        ];

        for (const prop of properties) {
            const existing = await Property.findOne({ name: prop.name });
            if (!existing) {
                await Property.create(prop);
                console.log(`Created property: ${prop.name}`);
            } else {
                console.log(`Property already exists: ${prop.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding properties:', error);
        process.exit(1);
    }
}

seed();
