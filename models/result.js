const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quiz",
            required: true,
        },

        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Question",
                    required: true,
                },
                selectedAnswer: {
                    type: String,
                    required: true,
                },
                isCorrect: {
                    type: Boolean,
                },
                marksObtained: {
                    type: Number,
                    default: 0,
                },
            },
        ],

        score: {
            type: Number,
            default: 0,
        },

        totalMarks: {
            type: Number,
            default: 0,
        },

        completedAt: {
            type: Date,
            default: Date.now,
        },

        timeTaken: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);