// models/Question.js

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length >= 2;
        },
        message: "At least 2 options are required",
      },
    },

    correctAnswer: {
      type: String,
      required: true,
    },

    marks: {
      type: Number,
      required: true,
      min: 1,
      default:1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);