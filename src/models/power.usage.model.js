const mongoose = require("mongoose");

const powerUsageSchema = new mongoose.Schema(
    {
        deviceId: {
            type: String, // Now storing `deviceId` as a string instead of ObjectId
            required: true,
        },
        usage: {
            type: Number,
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const PowerUsage = mongoose.model("PowerUsage", powerUsageSchema);
module.exports = PowerUsage;
