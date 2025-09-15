const express = require('express');
const Show = require('../models/Shows');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      type = '',
      rating = '',
      sortBy = 'title',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { cast: { $regex: search.trim(), $options: 'i' } },
        { director: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (type && ['Movie', 'TV Show'].includes(type)) {
      query.type = type;
    }

    if (rating) {
      query.rating = rating;
    }

    if (!req.user.isAdult) {
      query.rating = { $nin: ['R', 'NC-17', 'TV-MA'] };
    }

    const sortObj = {};
    const validSortFields = ['title', 'release_year', 'date_added', 'rating', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'title';
    const order = sortOrder === 'desc' ? -1 : 1;
    sortObj[sortField] = order;

    const [shows, totalCount] = await Promise.all([
      Show.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Show.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      shows,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNum
      },
      filters: {
        search: search.trim(),
        type,
        rating,
        sortBy: sortField,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Get shows error:', error);
    res.status(500).json({ error: 'Failed to fetch shows' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const show = await Show.findOne({
      $or: [
        { _id: id },
        { show_id: id }
      ]
    });

    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    if (!req.user.isAdult && ['R', 'NC-17', 'TV-MA'].includes(show.rating)) {
      return res.status(403).json({ error: 'This content is restricted for users under 18' });
    }

    res.json({ show });

  } catch (error) {
    console.error('Get show by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch show details' });
  }
});

router.get('/filters/options', authenticateToken, async (req, res) => {
  try {
    const [types, ratings, genres] = await Promise.all([
      Show.distinct('type'),
      Show.distinct('rating'),
      Show.distinct('listed_in')
    ]);

    const allGenres = genres
      .flatMap(genre => genre.split(','))
      .map(genre => genre.trim())
      .filter(genre => genre)
      .filter((genre, index, arr) => arr.indexOf(genre) === index)
      .sort();

    const availableRatings = req.user.isAdult 
      ? ratings.filter(rating => rating) 
      : ratings.filter(rating => rating && !['R', 'NC-17', 'TV-MA'].includes(rating));

    res.json({
      types: types.sort(),
      ratings: availableRatings.sort(),
      genres: allGenres.slice(0, 20)
    });

  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [totalShows, movieCount, tvShowCount, ratingStats] = await Promise.all([
      Show.countDocuments(),
      Show.countDocuments({ type: 'Movie' }),
      Show.countDocuments({ type: 'TV Show' }),
      Show.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      totalShows,
      breakdown: {
        movies: movieCount,
        tvShows: tvShowCount
      },
      ratingDistribution: ratingStats,
      userAccess: {
        isAdult: req.user.isAdult,
        restrictedContent: !req.user.isAdult
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
