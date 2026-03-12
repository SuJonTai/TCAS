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
    high_school: { type: String, default: '' },
    edu_status: { type: String, default: '' },       // 'studying' or 'graduated'
    current_level: { type: Number, default: null },
    gpax_5_term: { type: Number, default: null },
    plan_id: { type: Number, default: null },         // Ref to StudyPlan.id
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Virtual populate: get all scores for this user
UserSchema.virtual('USER_SCORES', {
  ref: 'ApplicantScore',
  localField: '_id',
  foreignField: 'user_id',
});

// Ensure virtuals are included in JSON/Object output
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
