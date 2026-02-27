const express = require("express");
const router = express.Router();

const {
    submitQuiz,
    getUserResults,
    getSingleResult,
    deleteResult,
} = require("../controllers/result");

const { authenticate, isAdmin } = require("../middleware/auth");

// Submit quiz
router.post("/submit", authenticate, submitQuiz);

// Get all results of logged user
router.get("/my-results", authenticate, getUserResults);

// Get single result
router.get("/:id", authenticate, getSingleResult);

// Delete result (admin)
router.delete("/:id", authenticate, isAdmin, deleteResult);

module.exports = router;