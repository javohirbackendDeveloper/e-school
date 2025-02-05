const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./lib/config");
const authRouter = require("./router/auth.routes");
const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());
connectDB();
const PORT = process.env.PORT || 3000;

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log("Server is running on the " + PORT);
});
