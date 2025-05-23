const mongoose = require("mongoose");

const powerSavingModeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        usage: {
            type: Number,
            required: true,
            default: 100
        },
        mode: {
            type: String,
            enum: [
                "POWERSAVING",
                "ULTRAPOWERSAVING",
                "EMERGENCY"
            ],
            required: true,
        },
        status: {
            type: String,
            enum: ["ON", "OFF"],
            default: "OFF",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const PowerUsage = mongoose.model("PowerSaving", powerSavingModeSchema);
module.exports = PowerUsage;
