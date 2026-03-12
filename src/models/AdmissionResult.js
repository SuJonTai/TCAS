import mongoose from 'mongoose';

const AdmissionResultSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionCriteria', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  gpax: { type: Number },
  portfolio_url: { type: String, default: '' },
  transcript_url: { type: String, default: '' },
  application_date: { type: Date, default: Date.now },
  calculated_score: { type: Number, default: 0 },
  remark: { type: String, default: "" },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Prevent duplicate applications
AdmissionResultSchema.index({ user_id: 1, criteria_id: 1 }, { unique: true });

export default mongoose.models.AdmissionResult || mongoose.model('AdmissionResult', AdmissionResultSchema);
