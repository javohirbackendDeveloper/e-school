const { Schema, model } = require("mongoose");

const authSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      minLength: [3, "Sizning username 3 harfdan oshishi kerak"],
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minLength: [6, "Sizning parol 6 harfdan oshishi kerak"],
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ["teacher", "student"],
        message: [`{VALUE} - mavjud emas`],
      },
    },
    verify_code: {
      type: Number,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = model("Auth", authSchema);
