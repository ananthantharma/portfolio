import {model, models, Schema} from 'mongoose';

const PasswordSchema = new Schema({
  userEmail:   {type: String, required: true},
  itemType:    {type: String, default: 'password'},
  title:       {type: String, required: true},
  favorite:    {type: Boolean, default: false},
  // Password
  site:        {type: String},
  username:    {type: String},
  password:    {type: String},
  // Card
  cardNumber:  {type: String},
  cardHolder:  {type: String},
  expiry:      {type: String},
  cvv:         {type: String},
  // Identity
  fullName:    {type: String},
  email:       {type: String},
  phone:       {type: String},
  address:     {type: String},
  dateOfBirth: {type: String},
  idNumber:    {type: String},
  // API Key
  service:     {type: String},
  apiKey:      {type: String},
  apiSecret:   {type: String},
  // Note
  content:     {type: String},
  // Shared
  notes:       {type: String},
  createdAt:   {type: Date, default: Date.now},
});

const Password = models.Password || model('Password', PasswordSchema);

export default Password;
