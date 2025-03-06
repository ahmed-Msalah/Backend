const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updateAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;
