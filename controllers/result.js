const Result = require("../models/result");
const Question = require("../models/question");
const Quiz = require("../models/quiz");


//  CREATE RESULT (Submit Quiz)
exports.submitQuiz = async (req, res) => {
    try {
        const { quizId, answers } = req.body;
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