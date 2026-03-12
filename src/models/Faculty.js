import mongoose from 'mongoose';

const FacultySchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Keeping numerical IDs to map directly from Supabase
  faculty_name: { type: String, required: true },
});

export default mongoose.models.Faculty || mongoose.model('Faculty', FacultySchema);
