// routes/questionRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");

const { createQuestion, getQuestionsByQuiz, getSingleQuestion, updateQuestion, deleteQuestion, } = require("../controllers/question");

const { authenticate, isAdmin } = require("../middleware/auth");
const uploadNone = multer();


// Create question (Admin only)
router.post("/", authenticate, uploadNone.none(), isAdmin, createQuestion);

// Get all questions of a quiz
router.get("/quiz/:quizId", authenticate, getQuestionsByQuiz);

// Get single question
router.get("/:id", authenticate, getSingleQuestion);

// Update question
router.put("/:id", authenticate, isAdmin, uploadNone.none(), updateQuestion);

// Delete question
router.delete("/:id", authenticate, isAdmin, deleteQuestion);

module.exports = router;