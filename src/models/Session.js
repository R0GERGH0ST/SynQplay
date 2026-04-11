import mongoose from 'mongoose';

// Sub-schemas to keep the main schema clean
const memberSchema = new mongoose.Schema({
  id: String,
  name: String,
  picture: String
}, { _id: false });

const trackSchema = new mongoose.Schema({
  id: String,
  title: String,
  artist: String,
  thumbnail: String
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  
  // Existing Features restored perfectly
  members: [memberSchema],
  queue: [trackSchema],
  queueIndex: { type: Number, default: 0 },
  currentTrack: trackSchema,
  
  // Playback State
  isPlaying: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  updatedBy: { type: String },
  
  // CRITICAL ENHANCEMENT: High-precision timestamp for zero-delay math
  timestamp: { type: Number, default: () => Date.now() }
}, { timestamps: true });

export default mongoose.models.Session || mongoose.model('Session', sessionSchema);