import mongoose from 'mongoose';

const AdmissionResultSchema = new mongoose.Schema({
  citizen_id: { type: String, required: true, unique: true }, // Reference to User.citizen_id
  criteria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionCriteria' }, // Allow null/unassigned
  status: { 
    type: String, 
    enum: ['pending', 'eligible', 'ineligible', 'passed_interview', 'failed_interview'], 
    default: 'pending' 
  },
  calculated_score: { type: Number, default: 0 },
  remark: { type: String, default: "" },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.AdmissionResult || mongoose.model('AdmissionResult', AdmissionResultSchema);
