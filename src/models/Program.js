import mongoose from 'mongoose';

const ProgramSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Keeping numerical IDs
  dept_id: { type: Number, required: true }, // Foreign key reference to Department.id
  prog_name: { type: String, required: true },
});

export default mongoose.models.Program || mongoose.model('Program', ProgramSchema);
