import mongoose, { Schema, model, models } from 'mongoose';

const PasswordSchema = new Schema({
    userEmail: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    site: {
        type: String,
        required: false,
        default: Date.now,
    },
});

const Password = models.Password || model('Password', PasswordSchema);

export default Password;
