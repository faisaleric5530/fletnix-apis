const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, age } = req.body;

    if (!email || !password || !age) {
      return res.status(400).json({ error: 'Email, password, and age are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (age < 1 || age > 120) {
      return res.status(400).json({ error: 'Age must be between 1 and 120' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = new User({ email, password, age });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        age: user.age,
        isAdult: user.isAdult
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        age: user.age,
        isAdult: user.isAdult
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      age: req.user.age,
      isAdult: req.user.isAdult,
      createdAt: req.user.createdAt
    }
  });
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { age } = req.body;
    
    if (age && (age < 1 || age > 120)) {
      return res.status(400).json({ error: 'Age must be between 1 and 120' });
    }

    const updates = {};
    if (age !== undefined) updates.age = age;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        age: user.age,
        isAdult: user.isAdult
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

module.exports = router;