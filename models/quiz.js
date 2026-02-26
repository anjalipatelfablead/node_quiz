const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        timeLimit: {
            type: Number,   // store minutes
            required: true,
            min: 1
        },
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);