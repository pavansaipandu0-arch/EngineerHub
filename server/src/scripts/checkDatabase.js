import 'dotenv/config';
import mongoose from 'mongoose';
import { databaseOptions } from '../config/database.js';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required to check the database connection.');
}

try {
  await mongoose.connect(process.env.MONGODB_URI, databaseOptions());
  await mongoose.connection.db.admin().ping();
  console.log(JSON.stringify({ status: 'ok', event: 'mongodb_ping_succeeded' }));
} finally {
  await mongoose.disconnect();
}
