import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    citizen_id: {
      type: String,
      required: true,
      unique: true,
       maxlength: 13,
    },
    password: {
      type: String,
       required: true,
    },
    first_name: {
      type: String,
      required: true,
     },
    last_name: {
      type: String,
      required: true,
     },
    role: {
      type: String,
      enum: ['student', 'staff', 'admin'],
       default: 'student',
    },
  },
   { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
