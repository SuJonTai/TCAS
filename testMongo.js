import mongoose from 'mongoose';

const uri = "mongodb+srv://Natpakarn:%402006Java@tcas.opbbcsc.mongodb.net/tcas?appName=TCAS";

mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESSFULLY CONNECTED TO MONGODB ATLAS!");
    process.exit(0);
  })
  .catch(err => {
    console.error("CONNECTION ERROR:", err);
    process.exit(1);
  });
