import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { databaseOptions } from '../config/database.js';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required to create database indexes.');
}

const modelsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../models');

try {
  await mongoose.connect(process.env.MONGODB_URI, databaseOptions());
  for (const entry of await readdir(modelsDirectory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      await import(pathToFileURL(path.join(modelsDirectory, entry.name)));
    }
  }

  for (const modelName of mongoose.modelNames()) {
    await mongoose.model(modelName).createIndexes();
    console.log(JSON.stringify({ event: 'mongodb_indexes_ready', model: modelName }));
  }
} finally {
  await mongoose.disconnect();
}
