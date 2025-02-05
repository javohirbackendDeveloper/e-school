const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGOURI);
    console.log("connected");
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectDB;
