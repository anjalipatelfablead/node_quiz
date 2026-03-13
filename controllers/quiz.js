const Quiz = require("../models/quiz");
const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");

// Helper function to notify all users about a new quiz
const notifyUsersAboutNewQuiz = async (quiz) => {
    try {
        const users = await User.find({ role: 'user', isActive: true }).select('email');
        const userEmails = users.map(user => user.email).join(', ');

        if (userEmails) {
            await sendEmail({
                to: userEmails,
                subject: "New Quiz Available: " + quiz.title,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #f97316;">New Quiz Alert!</h2>
                        <p>Hi there,</p>
                        <p>A new quiz <strong>"${quiz.title}"</strong> has been published in the <strong>${quiz.category}</strong> category.</p>
                        <p><strong>Description:</strong> ${quiz.description}</p>
                        <p><strong>Time Limit:</strong> ${quiz.timeLimit} minutes</p>
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="http://localhost:5173/quizzes" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Take Quiz Now</a>
                        </div>
                        <br/>
                        <p>Happy Learning!</p>
                        <p>Team Fablead Quiz</p>
                    </div>
                `,
            });
            console.log("Email notification sent to all users for quiz:", quiz.title);
        }
    } catch (error) {
        console.error("Failed to send email notifications:", error.message);
    }
};

// ================= CREATE QUIZ (Admin Only) =================
exports.createQuiz = async (req, res) => {
    try {
        const { title, description, category, timeLimit, status } = req.body;

        if (!title || !description || !category || !timeLimit) {
            return res.status(400).json({
                message: "All required fields must be provided",
            });
        }
        if (isNaN(timeLimit) || Number(timeLimit) <= 0) {
            return res.status(400).json({
                message: "Time limit must be a positive number (in minutes)"
            });
        }

        const newQuiz = new Quiz({
            title,
            description,
            category,
            timeLimit: Number(timeLimit),
            status,
            isActive: status === 'published',
            createdBy: req.user.userId,
        });

        await newQuiz.save();

        // If quiz is published at creation, notify users
        if (status === 'published') {
            notifyUsersAboutNewQuiz(newQuiz);
        }

        res.status(201).json({
            message: "Quiz created successfully",
            quiz: newQuiz,
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating quiz", error: error.message });
    }
};

// ================= GET ALL QUIZZES (User + Admin) =================
// exports.getAllQuizzes = async (req, res) => {
//     try {
//         const quizzes = await Quiz.find()
//             .populate("createdBy", "username email")
//             .sort({ createdAt: -1 });

//         res.status(200).json({
//             count: quizzes.length,
//             quizzes,
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Error fetching quizzes", error: error.message });
//     }
// };

// ================= GET ALL QUIZZES (Role Based) =================
exports.getAllQuizzes = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === "user") {
            filter.status = "published";
        }

        // If admin  (show all)
        const quizzes = await Quiz.find(filter)
            .populate("createdBy", "username email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: quizzes.length,
            quizzes,
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching quizzes",
            error: error.message
        });
    }
};

// ================= GET SINGLE QUIZ =================
exports.getQuizById = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .populate("createdBy", "username email");

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        res.status(200).json({ quiz });
    } catch (error) {
        res.status(500).json({ message: "Error fetching quiz", error: error.message });
    }
};

// ================= UPDATE QUIZ (Admin Only) =================
exports.updateQuiz = async (req, res) => {
    try {
        const quizId = req.params.id;

        // Check if quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        const { title, description, category, timeLimit, status, isActive } = req.body;

        const updateData = {};

        // Update title
        if (title) {
            updateData.title = title.trim();
        }

        // Update description
        if (description) {
            updateData.description = description;
        }

        // Update category
        if (category) {
            updateData.category = category.trim();
        }

        // Update timeLimit (minutes validation)
        if (timeLimit !== undefined) {
            if (isNaN(timeLimit) || Number(timeLimit) <= 0) {
                return res.status(400).json({
                    message: "Time limit must be a positive number (in minutes)"
                });
            }
            updateData.timeLimit = Number(timeLimit);
        }

        // Update status (validate enum manually if needed)
        if (status) {
            const allowedStatus = ["draft", "published", "archived"];
            if (!allowedStatus.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status value"
                });
            }
            updateData.status = status;
            // When publishing, set isActive to true by default
            if (status === 'published' && quiz.status !== 'published') {
                updateData.isActive = true;
                notifyUsersAboutNewQuiz(quiz); // Notify users when status changes to published
            }
        }

        // Update isActive status
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        const updatedQuiz = await Quiz.findByIdAndUpdate(
            quizId,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Quiz updated successfully",
            quiz: updatedQuiz,
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating quiz",
            error: error.message
        });
    }
};

// ================= DELETE QUIZ (Admin Only) =================
exports.deleteQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        await Quiz.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Quiz deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ message: "Error deleting quiz", error: error.message });
    }
};