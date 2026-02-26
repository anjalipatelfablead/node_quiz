const express = require("express");
const router = express.Router();
const multer = require("multer");

const quizController = require("../controllers/quiz");
const { authenticate, isAdmin } = require("../middleware/auth");

const uploadNone = multer();

// ================= VIEW (User + Admin) =================

// Get all quizzes
router.get("/", authenticate, quizController.getAllQuizzes);

// Get single quiz
router.get("/:id", authenticate, quizController.getQuizById);

// ================= ADMIN ONLY =================

// Create quiz
router.post("/", authenticate, isAdmin, uploadNone.none(), quizController.createQuiz);

// Update quiz
router.put("/:id", authenticate, isAdmin, uploadNone.none(), quizController.updateQuiz);

// Delete quiz
router.delete("/:id", authenticate, isAdmin, quizController.deleteQuiz);

module.exports = router;