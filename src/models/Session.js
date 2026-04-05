import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  members: { type: Array, default: [] },
  queue: { type: Array, default: [] },
  queueIndex: { type: Number, default: -1 },
  currentTrack: { type: Object, default: null },
  isPlaying: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  updatedBy: { type: String, default: '' },
  timestamp: { type: Number, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Session || mongoose.model('Session', SessionSchema);