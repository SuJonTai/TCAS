import mongoose from 'mongoose';

const StudyPlanSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, 
  plan_name: { type: String, required: true },
});

export default mongoose.models.StudyPlan || mongoose.model('StudyPlan', StudyPlanSchema);
