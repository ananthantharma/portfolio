// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();  // If you are using the .env file for storing DB_URI

// Initialize Express app
const app = express();

// Use Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const dbURI = process.env.DB_URI || "mongodb+srv://lankanprinze:0fwgsfbZQjrIRTHd@cluster0.i1lbm7e.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("Could not connect to MongoDB Atlas:", err));

// Define Schema and Model for MongoDB
const contactFormSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String
});

const ContactForm = mongoose.model('ContactForm', contactFormSchema);

// POST API Endpoint to Store Data
app.post('/submitForm', async (req, res) => {
  const { name, email, message } = req.body;
  
  try {
    const newContact = new ContactForm({
      name,
      email,
      message
    });
    
    await newContact.save();
    res.status(200).json({ message: 'Form submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit form', error });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/`);
});
