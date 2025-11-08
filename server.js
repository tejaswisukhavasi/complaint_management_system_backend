const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// =============================
// ✅ CORS Configuration
// =============================
const allowedOrigins = [
  'http://localhost:3000', // Local development
  process.env.CLIENT_URL    // Frontend hosted on Vercel
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// =============================
// ✅ Middleware
// =============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// =============================
// ✅ Routes
// =============================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/', (req, res) => {
  res.send('Backend Running ✅');
});

// =============================
// ✅ MongoDB Connection
// =============================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// =============================
// ✅ Error Handling
// =============================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// =============================
// ✅ Server Start
// =============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
