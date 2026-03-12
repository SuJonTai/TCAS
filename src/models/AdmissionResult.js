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

AdmissionResultSchema.virtual('USERS', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

AdmissionResultSchema.virtual('ADMISSION_CRITERIA', {
  ref: 'AdmissionCriteria',
  localField: 'criteria_id',
  foreignField: '_id',
  justOne: true
});

AdmissionResultSchema.virtual('APPLICANT_SCORES', {
  ref: 'ApplicantScore',
  localField: 'user_id',
  foreignField: 'user_id'
});

AdmissionResultSchema.set('toObject', { virtuals: true });
AdmissionResultSchema.set('toJSON', { virtuals: true });

export default mongoose.models.AdmissionResult || mongoose.model('AdmissionResult', AdmissionResultSchema);
