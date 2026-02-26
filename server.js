const express = require('express');
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const db = require("./config/db_connect");
const userroute = require("./routes/user_route");
const quizRoutes = require("./routes/quiz_route");
const questionRoutes = require("./routes/question_route");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

db();

// API Routes
app.use("/api/users", userroute);
app.use("/api/quizzes", quizRoutes);
app.use("/api/questions",questionRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});