const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  show_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Movie', 'TV Show'],
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  director: {
    type: String,
    trim: true,
    default: ''
  },
  cast: {
    type: String,
    trim: true,
    default: '',
    index: 'text'
  },
  country: {
    type: String,
    trim: true,
    default: ''
  },
  date_added: {
    type: String,
    trim: true,
    default: ''
  },
  release_year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 5
  },
  rating: {
    type: String,
    trim: true,
    enum: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', 'NR', 'UR', ''],
    default: ''
  },
  duration: {
    type: String,
    trim: true,
    default: ''
  },
  listed_in: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: '',
    index: 'text'
  }
}, {
  timestamps: true
});

showSchema.index({
  title: 'text',
  cast: 'text',
  description: 'text',
  director: 'text'
}, {
  weights: {
    title: 10,
    cast: 5,
    director: 3,
    description: 1
  }
});

// Index for filtering
showSchema.index({ type: 1 });
showSchema.index({ rating: 1 });
showSchema.index({ release_year: 1 });

module.exports = mongoose.model('Show', showSchema);