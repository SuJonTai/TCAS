import connectToDatabase from '../src/lib/mongodb.js';
import AdmissionResult from '../src/models/AdmissionResult.js';
import User from '../src/models/User.js';
import ApplicantScore from '../src/models/ApplicantScore.js';
import AdmissionCriteria from '../src/models/AdmissionCriteria.js';

async function checkData() {
  await connectToDatabase();
  console.log("Connected to DB");

  const app = await AdmissionResult.findOne().lean();
  console.log("Sample Application:", JSON.stringify(app, null, 2));

  if (app && app.user_id) {
    const user = await User.findById(app.user_id).lean();
    console.log("Linked User:", JSON.stringify(user, null, 2));
  }

  const results = await AdmissionResult.find()
    .populate({ path: 'USERS', strictPopulate: false })
    .limit(1)
    .lean({ virtuals: true });
  
  console.log("Populated Sample:", JSON.stringify(results[0], null, 2));

  process.exit(0);
}

checkData();
