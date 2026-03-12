import mongoose from 'mongoose';

const AdmissionProjectSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, 
  project_name: { type: String, required: true },
});

export default mongoose.models.AdmissionProject || mongoose.model('AdmissionProject', AdmissionProjectSchema);
