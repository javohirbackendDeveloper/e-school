const authSchema = require("../schema/auth.schema");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const redis = require("../lib/redis");
// CREATE TOKEN

const token_generator = async (user_id) => {
  const accessToken = jwt.sign({ user_id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ user_id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

// WRITING REFRESH TOKEN TO THE REDIS

const redis_refreshToken = async (user_id, refreshToken) => {
  await redis.set(
    `refresh_token:${user_id}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60 * 1000
  );
};

// WRITING TOKENS TO THE COOKIE

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_STATUS === "production",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_STATUS === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// APIS

// REGISTER
const register = async (req, res) => {
  try {
    const { username, role, password, email } = req.body;
    const foundedUser = await authSchema.findOne({ email });

    if (foundedUser) {
      return res.json({ message: "This user already exist" });
    }

    const transporter = await nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_GOOGLE,
        pass: process.env.GOOGLE_PASSKEY,
      },
    });

    const randomNumber = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 10)
    ).join("");

    const send = {
      from: process.env.GMAIL_GOOGLE,
      to: email,
      subject: "test",
      html: `<p style = " font-size : 30px;">Tasdiqlash kodi : <b style = "color : blue;">${randomNumber}</b></p>`,
    };

    transporter.sendMail(send, (error, info) => {
      if (error) {
        res.json({
          message: error.message,
        });
      } else {
        res.json({
          message: info.response,
        });
      }
    });

    const hash = await bcrypt.hash(password, 12);

    const user = await authSchema.create({
      email,
      username,
      role,
      password: hash,
      verify_code: randomNumber,
    });

    setTimeout(() => {
      authSchema.findOne(user._id);
      authSchema.findByIdAndUpdate(user._id, {
        verify_code: null,
      });
    }, 60 * 1000);
    res.json({
      message: "Registered",
      user,
    });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
};

// VERIFY EMAIL

const verify = async (req, res) => {
  try {
    const { code, email } = req.body;

    const foundedUser = await authSchema.findOne({ email });
    if (!foundedUser) {
      return res.json({ message: "This user not found" });
    }

    if (foundedUser.verify_code != code) {
      return res.json({
        message: "Siz kiritgan tasdiqlash kodi xato yoki eskirgan",
      });
    }

    foundedUser.isVerified = true;
    foundedUser.verify_code = "";
    await foundedUser.save();

    const { accessToken, refreshToken } = await token_generator(
      foundedUser?._id
    );
    await redis_refreshToken(foundedUser?._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    return res.json({
      message: "Email muvaffaqiyatli tasdiqlandi",
      foundedUser,
    });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
};

// LOGIN

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    const user = await authSchema.findOne({ email });
    if (!user || user.isVerified !== true) {
      return res.json({ message: "This user not found" });
    }

    const password_checker = await bcrypt.compare(password, user.password);

    if (!password_checker) {
      return res.json({ message: "Siz parolni xato kiritdingiz" });
    }

    const { accessToken, refreshToken } = await token_generator(user?._id);
    await redis_refreshToken(user?._id, refreshToken);
    await setCookies(res, accessToken, refreshToken);

    res.json({
      message: "Login muvaffaqiyatli",
      refreshToken,
      accessToken,
      user,
    });
  } catch (error) {
    console.log(error);
    res.json(error);
  }
};

// LOGOUT

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      await redis.del(`refresh_token:${decoded.userId}`);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
module.exports = {
  register,
  verify,
  login,
  logout,
};
