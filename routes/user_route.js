const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const userController = require("../controllers/user");
const { authenticate, isAdmin } = require("../middleware/auth");

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, "user-" + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

// Initialize multer upload with file handling
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Initialize multer without file handling for form-data parsing only
const uploadNone = multer();

// ==================== PUBLIC ROUTES ====================

// @route   POST /api/users/register
router.post("/register", upload.single("profileImage"), userController.registerUser);

// @route   POST /api/users/login
router.post("/login", uploadNone.none(), userController.loginUser);

// ==================== PROTECTED/ PRIVATE ROUTES ====================

// @route   GET /api/users/profile/me

router.get("/profile/me", authenticate, userController.getMyProfile);

// @route   PUT /api/users/profile/me
// Supports both form-data (with optional profileImage) and JSON
router.put("/profile/me", authenticate, upload.single("profileImage"), userController.updateMyProfile);

// @route   DELETE /api/users/profile/me
router.delete("/profile/me", authenticate, userController.deleteMyAccount);

// ==================== ADMIN ROUTES ====================

// @route   GET /api/users   (get all users)
router.get("/", authenticate, isAdmin, userController.getAllUsers);

// @route   GET /api/users/:id (get user by id)
router.get("/:id", authenticate, userController.getUserById);

// @route   PUT /api/users/:id (Update user by ID)
// Supports both form-data (with optional profileImage) and JSON
router.put("/:id", authenticate, upload.single("profileImage"), userController.updateUser);

// @route   DELETE /api/users/:id (delete user)
router.delete("/:id", authenticate, isAdmin, userController.deleteUser);

module.exports = router;