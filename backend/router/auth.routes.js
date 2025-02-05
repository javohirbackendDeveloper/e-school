const { Router } = require("express");
const {
  register,
  verify,
  login,
  logout,
} = require("../controller/auth.controller");

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/verify", verify);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
module.exports = authRouter;
