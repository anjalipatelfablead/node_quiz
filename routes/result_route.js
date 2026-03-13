const express = require("express");
const router = express.Router();

const {
    submitQuiz,
    getUserResults,
    getSingleResult,
    deleteResult,
    getAllResults,
    generateCertificate,
} = require("../controllers/result");

const { authenticate, isAdmin } = require("../middleware/auth");

// Submit quiz
router.post("/submit", authenticate, submitQuiz);

// Get all results of logged user
router.get("/my-results", authenticate, getUserResults);

// Get all results (admin only)
router.get("/all", authenticate, isAdmin, getAllResults);

// Get single result
router.get("/:id", authenticate, getSingleResult);

// Generate certificate
router.get("/:id/certificate", authenticate, generateCertificate);

// Delete result (admin)
router.delete("/:id", authenticate, isAdmin, deleteResult);

module.exports = router;