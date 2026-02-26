// controllers/questionController.js

const Question = require("../models/question");
const Quiz = require("../models/quiz");


//  CREATE QUESTION
exports.createQuestion = async (req, res) => {
    try {
        let { quizId, questionText, options, correctAnswer, marks } = req.body;

        if (typeof options === "string") {
            options = JSON.parse(options);
        }
        // Check quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Validate correctAnswer exists in options
        if (!options.includes(correctAnswer)) {
            return res.status(400).json({
                message: "Correct answer must be one of the options",
            });
        }

        const question = await Question.create({
            quizId,
            questionText,
            options,
            correctAnswer,
            marks,
        });

        res.status(201).json({
            message: "Question created successfully",
            question,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating question",
            error: error.message,
        });
    }
};



//  GET ALL QUESTIONS OF A QUIZ
exports.getQuestionsByQuiz = async (req, res) => {
    try {
        const questions = await Question.find({
            quizId: req.params.quizId,
        });

        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching questions",
            error: error.message,
        });
    }
};



// GET SINGLE QUESTION
exports.getSingleQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json(question);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching question",
            error: error.message,
        });
    }
};



//  UPDATE QUESTION
exports.updateQuestion = async (req, res) => {
    try {
        const { questionText, options, correctAnswer, marks } = req.body;

        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        if (questionText) question.questionText = questionText;
        if (options) question.options = options;
        if (marks) question.marks = marks;

        if (correctAnswer) {
            if (!question.options.includes(correctAnswer)) {
                return res.status(400).json({
                    message: "Correct answer must be one of the options",
                });
            }
            question.correctAnswer = correctAnswer;
        }

        await question.save();

        res.status(200).json({
            message: "Question updated successfully",
            question,
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating question",
            error: error.message,
        });
    }
};



//  DELETE QUESTION
exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json({
            message: "Question deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting question",
            error: error.message,
        });
    }
};