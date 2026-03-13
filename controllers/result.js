const Result = require("../models/result");
const Question = require("../models/question");
const Quiz = require("../models/quiz");
const puppeteer = require("puppeteer");
const User = require("../models/user");


//  CREATE RESULT (Submit Quiz)
exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, answers, timeTaken } = req.body;
        const userId = req.user.userId;

        // Validate required fields
        if (!quizId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({
                message: "Invalid request. quizId and answers array are required."
            });
        }

        // Check quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        let totalMarks = 0;
        let score = 0;

        // Get all questions of quiz
        const questions = await Question.find({ quizId });

        // Map for quick access
        const questionMap = {};
        questions.forEach((q) => {
            questionMap[q._id.toString()] = q;
            totalMarks += q.marks;
        });

        // Evaluate answers
        const evaluatedAnswers = answers.map((ans) => {
            const question = questionMap[ans.questionId];

            if (!question) {
                return {
                    questionId: ans.questionId,
                    selectedAnswer: ans.selectedAnswer,
                    isCorrect: false,
                    marksObtained: 0,
                };
            }

            const isCorrect = question.correctAnswer === ans.selectedAnswer;
            const marksObtained = isCorrect ? question.marks : 0;

            if (isCorrect) score += question.marks;

            return {
                questionId: ans.questionId,
                selectedAnswer: ans.selectedAnswer,
                isCorrect,
                marksObtained,
            };
        });

        const result = await Result.create({
            userId,
            quizId,
            answers: evaluatedAnswers,
            score,
            totalMarks,
            timeTaken: timeTaken || 0,
        });

        res.status(201).json({
            message: "Quiz submitted successfully",
            result,
        });

    } catch (error) {
        res.status(500).json({
            message: "Error submitting quiz",
            error: error.message,
        });
    }
};



//  GET RESULT BY USER
exports.getUserResults = async (req, res) => {
    try {
        const results = await Result.find({ userId: req.user.userId })
            .populate("quizId", "title")
            .sort({ createdAt: -1 });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching results",
            error: error.message,
        });
    }
};

//  GET ALL RESULTS (Admin only)
exports.getAllResults = async (req, res) => {
    try {
        const results = await Result.find()
            .populate("quizId", "title")
            .populate("userId", "username email")
            .sort({ createdAt: -1 });

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching all results",
            error: error.message,
        });
    }
};



//  GET RESULT BY ID
exports.getSingleResult = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate("quizId", "title")
            .populate("answers.questionId", "questionText options correctAnswer");

        if (!result) {
            return res.status(404).json({ message: "Result not found" });
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching result",
            error: error.message,
        });
    }
};



//  DELETE RESULT (optional - admin)
exports.deleteResult = async (req, res) => {
    try {
        const result = await Result.findByIdAndDelete(req.params.id);

        if (!result) {
            return res.status(404).json({ message: "Result not found" });
        }

        res.status(200).json({
            message: "Result deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting result",
            error: error.message,
        });
    }
};

// GENERATE CERTIFICATE
exports.generateCertificate = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate("quizId", "title")
            .populate("userId", "username email");

        if (!result) {
            return res.status(404).json({ message: "Result not found" });
        }

        const percentage = Math.round((result.score / result.totalMarks) * 100);

        if (percentage < 60) {
            return res.status(403).json({ message: "Certificate only available for scores 60% and above" });
        }

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        const page = await browser.newPage();

        const content = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f0f0f0;
                }
                .certificate {
                    width: 800px;
                    padding: 50px;
                    text-align: center;
                    border: 15px solid #ffa500;
                    background-color: white;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    position: relative;
                }
                .header {
                    font-size: 50px;
                    color: #333;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                }
                .sub-header {
                    font-size: 24px;
                    color: #666;
                    margin-bottom: 40px;
                }
                .name {
                    font-size: 40px;
                    font-weight: bold;
                    color: #ffa500;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #eee;
                    display: inline-block;
                    padding-bottom: 10px;
                }
                .quiz-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #444;
                    margin: 20px 0;
                }
                .score {
                    font-size: 22px;
                    color: #555;
                    margin-top: 30px;
                }
                .date {
                    margin-top: 40px;
                    font-size: 18px;
                    color: #888;
                }
                .footer {
                    margin-top: 50px;
                    font-size: 14px;
                    color: #aaa;
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="header">Certificate of Achievement</div>
                <div class="sub-header">This is to certify that</div>
                <div class="name">${result.userId.username}</div>
                <div class="sub-header">has successfully completed the quiz</div>
                <div class="quiz-title">${result.quizId.title}</div>
                <div class="score">With a score of <strong>${percentage}%</strong></div>
                <div class="date">Date: ${new Date(result.createdAt).toLocaleDateString()}</div>
                <div class="footer">Fablead Quiz Platform</div>
            </div>
        </body>
        </html>
        `;

        await page.setContent(content);
        const pdf = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true
        });

        await browser.close();

        res.contentType("application/pdf");
        res.send(pdf);

    } catch (error) {
        console.error("Certificate generation error:", error);
        res.status(500).json({
            message: "Error generating certificate",
            error: error.message,
        });
    }
};