const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeviceCategory",
            required: true,
        },
        status: {
            type: String,
            enum: ["ON", "OFF"],
            default: "OFF",
        },
        pinNumber: {
            type: Number,
            required: true,
        },
        priority: {
            type: Number,
            required: true,
            enum: [1, 2, 3],
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const Device = mongoose.model("Device", deviceSchema);
module.exports = Device;
