const mongoose = require("mongoose");
const url = process.env.MONGODB_URI;

console.log("MongoDB URI: ", url);

const dbconnect = async () => {
    try {
        await mongoose.connect(url, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
        });
        console.log("Database connected successfully");
    } catch (err) {
        console.error("Database connection error: ", err.message);
        setTimeout(() => {
            console.log("Retrying connection...");
            dbconnect();
        }, 5000);
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected, attempting to reconnect...");
    dbconnect();
});

module.exports = dbconnect;