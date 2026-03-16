const mongoose = require("mongoose");

const url = process.env.MONGODB_URI;

let isConnecting = false;

const dbconnect = async () => {
    if (isConnecting) return;   // prevent multiple loops
    isConnecting = true;

    try {
        await mongoose.connect(url, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("✅ Database connected successfully");
        isConnecting = false;

    } catch (err) {
        console.error("❌ Database connection error:", err.message);

        isConnecting = false;

        setTimeout(() => {
            console.log("🔁 Retrying DB connection...");
            dbconnect();
        }, 5000);
    }
};

// reconnect only when connection lost AFTER success
mongoose.connection.on("disconnected", () => {
    console.log("⚠️ MongoDB disconnected");
});

module.exports = dbconnect;