// clear.js
const mongoose = require("mongoose");

async function clearDB() {
  await mongoose.connect("mongodb://127.0.0.1:27017/bananaquest");
  await mongoose.connection.dropDatabase();
  console.log("🔥 Database wiped clean!");
  process.exit();
}

clearDB();
