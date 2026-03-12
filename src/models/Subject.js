import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, 
  subject_name: { type: String, required: true },
  subject_type: { type: String }, // 'TGAT', 'TPAT', 'A-Level'
});

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
