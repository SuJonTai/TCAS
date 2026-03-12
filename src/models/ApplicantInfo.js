import mongoose from 'mongoose';

const ApplicantInfoSchema = new mongoose.Schema(
  {
    citizen_id: {
      type: String,
      required: true,
      unique: true,
     },
    first_name: String,
    last_name: String,
    title_name: String,
    gender: String,
    birth_date: Date,
     nationality: String,
    religion: String,
    blood_group: String,
    phone_number: String,
     email: String,
    
    // Address
    addressLine1: String,
    subdistrict: String,
     district: String,
    province: String,
    zipCode: String,

     // Education
    edu_level: String,
    edu_status: String,
    school_name: String,
     school_province: String,
    grad_year: String,
    gpax: Number,

    // Uploads
     transcript_url: String,
    portfolio_url: String,
    photo_url: String,
    medical_cert_url: String,
     id_card_url: String,
    house_reg_url: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.models.ApplicantInfo || mongoose.model('ApplicantInfo', ApplicantInfoSchema);
