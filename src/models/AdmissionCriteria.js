import mongoose from 'mongoose';

const CriteriaPlanSchema = new mongoose.Schema({
  criteria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionCriteria', required: true },
  plan_id: { type: Number, required: true }, // ref to StudyPlan.id
});

export const CriteriaPlan = mongoose.models.CriteriaPlan || mongoose.model('CriteriaPlan', CriteriaPlanSchema);

const CriteriaSubjectSchema = new mongoose.Schema({
  criteria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionCriteria', required: true },
  subject_id: { type: Number, required: true }, // ref to Subject.id
  min_score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
});

export const CriteriaSubject = mongoose.models.CriteriaSubject || mongoose.model('CriteriaSubject', CriteriaSubjectSchema);

const AdmissionCriteriaSchema = new mongoose.Schema({
  academic_year: { type: Number, required: true },
  tcas_round: { type: Number, required: true },
  max_seats: { type: Number, required: true },
  min_gpax: { type: Number, required: true },
  edu_status_req: [{ type: String }],
  
  // Relations mapped by Number IDs for easier Supabase migration initially
  program_id: { type: Number, required: true }, 
  project_id: { type: Number, required: true },
  
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Virtuals to populate the related plans and subjects without tight coupling in the DB
AdmissionCriteriaSchema.virtual('CRITERIA_PLANS', {
  ref: 'CriteriaPlan',
  localField: '_id',
  foreignField: 'criteria_id'
});

AdmissionCriteriaSchema.virtual('CRITERIA_SUBJECTS', {
  ref: 'CriteriaSubject',
  localField: '_id',
  foreignField: 'criteria_id'
});

AdmissionCriteriaSchema.set('toObject', { virtuals: true });
AdmissionCriteriaSchema.set('toJSON', { virtuals: true });

export default mongoose.models.AdmissionCriteria || mongoose.model('AdmissionCriteria', AdmissionCriteriaSchema);
