const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
};

// Validation helper functions
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // Password must be at least 8 characters long
    // Must contain at least one uppercase letter, one lowercase letter, one number, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const validateUsername = (username) => {
    // Username must be 3-30 characters, alphanumeric with underscores allowed
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
};

const validateRole = (role) => {
    const allowedRoles = ["user", "admin"];
    return allowedRoles.includes(role);
};

// @desc    Register new user
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: "Please provide all required fields: username, email, password" 
            });
        }

        // Validate username
        if (!validateUsername(username)) {
            return res.status(400).json({ 
                message: "Invalid username. Username must be 3-30 characters long and can only contain letters, numbers, and underscores." 
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Validate password strength
        if (!validatePassword(password)) {
            return res.status(400).json({ 
                message: "Invalid password. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." 
            });
        }

        // Validate role if provided
        if (role && !validateRole(role)) {
            return res.status(400).json({ 
                message: "Invalid role. Allowed roles are: user, admin" 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Check if username is already taken
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: "Username is already taken" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Get profile image path if uploaded (optional)
        const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profileImage,
            role: role || "user"
        });

        await newUser.save();

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profileImage: newUser.profileImage,
                role: newUser.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
};

// @desc    Login user
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Please provide both email and password" 
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate token
        const token = generateToken(user);

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
};

// @desc    Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json({
            count: users.length,
            users
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

// @desc    Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
};

// @desc    Get current logged-in user profile
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile", error: error.message });
    }
};

// @desc    Update user
exports.updateUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const userId = req.params.id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only allow users to update their own profile or admin can update any
        if (req.user.userId !== userId && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to update this user" });
        }

        // Validate username if provided
        if (username) {
            if (!validateUsername(username)) {
                return res.status(400).json({ 
                    message: "Invalid username. Username must be 3-30 characters long and can only contain letters, numbers, and underscores." 
                });
            }
            // Check if username is already taken by another user
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                return res.status(400).json({ message: "Username is already taken" });
            }
        }

        // Validate email if provided
        if (email) {
            if (!validateEmail(email)) {
                return res.status(400).json({ message: "Invalid email format" });
            }
            // Check if email is already taken by another user
            const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
            if (existingEmail) {
                return res.status(400).json({ message: "Email is already in use" });
            }
        }

        // Validate password if provided
        if (password) {
            if (!validatePassword(password)) {
                return res.status(400).json({ 
                    message: "Invalid password. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." 
                });
            }
        }

        // Validate role if provided
        if (role) {
            if (!validateRole(role)) {
                return res.status(400).json({ 
                    message: "Invalid role. Allowed roles are: user, admin" 
                });
            }
            // Only admin can change roles
            if (req.user.role !== "admin") {
                return res.status(403).json({ message: "Not authorized to change role" });
            }
        }

        // Build update object
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (role && req.user.role === "admin") updateData.role = role;
        if (req.file) updateData.profileImage = `/uploads/${req.file.filename}`;

        // Hash password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
};

// @desc    Update current user profile
exports.updateMyProfile = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userId = req.user.userId;

        // Validate username if provided
        if (username) {
            if (!validateUsername(username)) {
                return res.status(400).json({ 
                    message: "Invalid username. Username must be 3-30 characters long and can only contain letters, numbers, and underscores." 
                });
            }
            // Check if username is already taken by another user
            const existingUsername = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUsername) {
                return res.status(400).json({ message: "Username is already taken" });
            }
        }

        // Validate email if provided
        if (email) {
            if (!validateEmail(email)) {
                return res.status(400).json({ message: "Invalid email format" });
            }
            // Check if email is already taken by another user
            const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
            if (existingEmail) {
                return res.status(400).json({ message: "Email is already in use" });
            }
        }

        // Validate password if provided
        if (password) {
            if (!validatePassword(password)) {
                return res.status(400).json({ 
                    message: "Invalid password. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." 
                });
            }
        }

        // Build update object
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (req.file) updateData.profileImage = `/uploads/${req.file.filename}`;

        // Hash password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id ( (Admin only))
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};

// @desc    Delete own account
// @route   DELETE /api/users/profile/me (only user)
exports.deleteMyAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.userId);
        res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting account", error: error.message });
    }
};
