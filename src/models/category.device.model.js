const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        arName: {
            type: String,
            required: true,
            unique: true,
        },
        enName: {
            type: String,
            required: true,
            unique: true,
        },

    },
    { timestamps: true }
);

const Category = mongoose.model("DeviceCategory", categorySchema);
module.exports = Category;
