import mongoose from 'mongoose';

const ApplicantScoreSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject_id: { type: Number, required: true },       // Ref to Subject.id
  score_value: { type: Number, required: true, min: 0, max: 100 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Composite unique key constraint
ApplicantScoreSchema.index({ user_id: 1, subject_id: 1 }, { unique: true });

export default mongoose.models.ApplicantScore || mongoose.model('ApplicantScore', ApplicantScoreSchema);
