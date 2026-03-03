const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

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
        const errors = {};

        // Validate required fields
        if (!username) errors.username = "Username is required";
        if (!email) errors.email = "Email is required";
        if (!password) errors.password = "Password is required";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors
            });
        }

        // Validate username
        if (!validateUsername(username)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { username: "Username must be 3-30 characters long and can only contain letters, numbers, and underscores." }
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { email: "Invalid email format" }
            });
        }

        // Validate password strength
        if (!validatePassword(password)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { password: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." }
            });
        }

        // Validate role if provided
        if (role && !validateRole(role)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { role: "Invalid role. Allowed roles are: user, admin" }
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { email: "User already exists with this email" }
            });
        }

        // Check if username is already taken
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { username: "Username is already taken" }
            });
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

        // Send success email
        await sendEmail({
            to: newUser.email,
            subject: "Welcome to Fablead Quiz!",
            html: `
        <h2>Welcome ${newUser.username}!</h2>
        <p>Your account has been created successfully.</p>
        <p>You can now log in and start using our platform.</p>
        <br/>
        <p>Thank you for joining us!</p>
    `,
        });

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
        const errors = {};

        // Validate required fields
        if (!email) errors.email = "Email is required";
        if (!password) errors.password = "Password is required";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors
            });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { email: "Invalid email format" }
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Authentication failed",
                errors: { email: "Invalid email or password" }
            });
        }

        // Check if user is active
        if (user.isActive === false) {
            return res.status(403).json({
                message: "Account deactivated",
                errors: { email: "Your account has been deactivated. Please contact admin." }
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Authentication failed",
                errors: { password: "Invalid email or password" }
            });
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
        const { username, email, password, oldPassword } = req.body;
        const userId = req.user.userId;

        // Get current user with password
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
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

            // Verify old password is provided
            if (!oldPassword) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: { oldPassword: "Old password is required to set a new password" }
                });
            }

            // Verify old password matches
            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
            if (!isOldPasswordValid) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: { oldPassword: "Old password is incorrect" }
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

// @desc    Toggle user active status (Admin only)
// @route   PATCH /api/users/:id/toggle-status
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent admin from deactivating themselves
        if (user._id.toString() === req.user.userId) {
            return res.status(403).json({ message: "You cannot change your own status" });
        }

        user.isActive = !user.isActive;
        await user.save();

        // Send email notification
        const emailSubject = `Your account has been ${user.isActive ? 'activated' : 'deactivated'}`;
        const emailHtml = `
            <p>Hello ${user.username},</p>
            <p>Your account has been temporarily ${user.isActive ? 'activated' : 'deactivated'} by an administrator.</p>
            <p>If you have any questions, please contact support.</p>
        `;

        await sendEmail({
            to: user.email,
            subject: emailSubject,
            html: emailHtml,
        });

        res.status(200).json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error toggling user status", error: error.message });
    }
};

// Generate random reset token
const generateResetToken = () => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
};

// @desc    Forgot password - Generate reset token
// @route   POST /api/users/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { email: "Email is required" }
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { email: "Invalid email format" }
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                errors: { email: "No account found with this email address" }
            });
        }

        // Check if user is active
        // if (user.isActive === false) {
        //     return res.status(403).json({
        //         message: "Account deactivated",
        //         errors: { email: "Your account has been deactivated. Please contact admin." }
        //     });
        // }

        // Generate reset token
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Save reset token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Send reset email
        await sendEmail({
            to: user.email,
            subject: "Password Reset Request - Fablead Quiz",
            html: `
                <h2>Password Reset Request</h2>
                <p>Hello ${user.username},</p>
                <p>We received a request to reset your password. Click the button below to reset it:</p>
                <p style="margin: 20px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}" style="padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </p>
                <p>This link will expire in 30 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br/>
                <p>Thank you,</p>
                <p>Fablead Quiz Team</p>
            `,
        });

        res.status(200).json({
            message: "Password reset instructions sent to your email"
        });
    } catch (error) {
        res.status(500).json({ message: "Error processing forgot password request", error: error.message });
    }
};

// @desc    Reset password with token
// @route   POST /api/users/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const errors = {};

        // Validate required fields
        if (!resetToken) errors.resetToken = "Reset token is required";
        if (!newPassword) errors.newPassword = "New password is required";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                message: "Validation failed",
                errors
            });
        }

        // Validate password strength
        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message: "Validation failed",
                errors: { newPassword: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)." }
            });
        }

        // Find user with valid reset token
        const user = await User.findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired token",
                errors: { resetToken: "The reset token is invalid or has expired. Please request a new one." }
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        // Send confirmation email
        await sendEmail({
            to: user.email,
            subject: "Password Reset Successful - Fablead Quiz",
            html: `
                <h2>Password Reset Successful</h2>
                <p>Hello ${user.username},</p>
                <p>Your password has been successfully reset.</p>
                <p>You can now log in with your new password.</p>
                <br/>
                <p>If you didn't make this change, please contact support immediately.</p>
                <br/>
                <p>Thank you,</p>
                <p>Fablead Quiz Team</p>
            `,
        });

        res.status(200).json({
            message: "Password reset successful. Please login with your new password."
        });
    } catch (error) {
        res.status(500).json({ message: "Error resetting password", error: error.message });
    }
};
