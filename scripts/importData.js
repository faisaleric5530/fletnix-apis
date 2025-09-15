const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Show = require('../models/Shows');
require('dotenv').config();

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    await Show.deleteMany({});
    console.log('Cleared existing shows data');

    const shows = [];

    const validRatings = [
      'G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA', ''
    ];

    fs.createReadStream('./netflix_titles.csv')
      .pipe(csv())
      .on('data', (row) => {
        const show = {
          show_id: row.show_id?.trim() || '',
          type: row.type?.trim() || '',
          title: row.title?.trim() || '',
          director: row.director?.trim() || '',
          cast: row.cast?.trim() || '',
          country: row.country?.trim() || '',
          date_added: row.date_added?.trim() || '',
          release_year: row.release_year ? parseInt(row.release_year) : null,
          rating: row.rating?.trim() || '',
          duration: row.duration?.trim() || '',
          listed_in: row.listed_in?.trim() || '',
          description: row.description?.trim() || ''
        };

        if (
          show.show_id &&
          show.type &&
          show.title &&
          validRatings.includes(show.rating)
        ) {
          shows.push(show);
        }
      })
      .on('end', async () => {
        try {
          await Show.insertMany(shows);
          console.log(`Successfully imported ${shows.length} shows`);

          const movieCount = shows.filter(show => show.type === 'Movie').length;
          const tvShowCount = shows.filter(show => show.type === 'TV Show').length;

          console.log(`Statistics:`);
          console.log(`- Movies: ${movieCount}`);
          console.log(`- TV Shows: ${tvShowCount}`);
          console.log(`- Total: ${shows.length}`);

          mongoose.connection.close();
          console.log('Database connection closed');

        } catch (error) {
          console.error('Error inserting data:', error);
          mongoose.connection.close();
          process.exit(1);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        mongoose.connection.close();
        process.exit(1);
      });

  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

importData();