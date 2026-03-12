import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // Keeping numerical IDs
  faculty_id: { type: Number, required: true }, // Foreign key reference to Faculty.id
  dept_name: { type: String, required: true },
});

export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
