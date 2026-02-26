const express = require("express");
const router = express.Router();
const multer = require("multer");

const { getAllQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz } = require("../controllers/quiz");

const { authenticate, isAdmin } = require("../middleware/auth");

const uploadNone = multer();

// ================= VIEW (User + Admin) =================

// Get all quizzes
router.get("/", authenticate, getAllQuizzes);

// Get single quiz
router.get("/:id", authenticate, getQuizById);

// ================= ADMIN ONLY =================

// Create quiz
router.post("/", authenticate, isAdmin, uploadNone.none(), createQuiz);

// Update quiz
router.put("/:id", authenticate, isAdmin, uploadNone.none(), updateQuiz);

// Delete quiz
router.delete("/:id", authenticate, isAdmin, deleteQuiz);

module.exports = router;