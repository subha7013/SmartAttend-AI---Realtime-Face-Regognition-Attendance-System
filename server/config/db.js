const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Drop the old unique index on (student, date) if it exists, to allow multiple teachers
    // to record attendance for the same student on the same day.
    try {
      await mongoose.connection.db.collection('attendances').dropIndex('student_1_date_1');
      console.log('Successfully dropped old unique index student_1_date_1');
    } catch (err) {
      if (err.codeName !== 'IndexNotFound') {
        console.warn('Warning dropping index student_1_date_1:', err.message);
      }
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
