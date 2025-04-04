const Sensor = require("../models/sensor.model");
const Device = require("../models/device.model");

createSensor = async (req, res) => {
    try {
        const { name, description, pinNumber, userId, categoryId, roomId } = req.body;
        const sensor = new Sensor({ userId, name, description, pinNumber, categoryId, roomId });
        await sensor.save();
        return res.status(201).json({ success: true, sensor });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error creating sensor", error });
    }
};


getAllSensors = async (req, res) => {
    try {
        const userId = req.user.id;

        const sensors = await Sensor.find({ userId }).lean();
        return res.status(200).json({ sensors });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching sensors", error });
    }
};


updateSensor = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSensor = await Sensor.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedSensor) {
            return res.status(404).json({ success: false, message: "Sensor not found" });
        }

        return res.status(200).json({ message: "Sensor Update Successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error updating sensor", error });
    }
};

deleteSensor = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSensor = await Sensor.findByIdAndDelete(id);

        if (!deletedSensor) {
            return res.status(404).json({ success: false, message: "Sensor not found" });
        }

        return res.status(200).json({ message: "Sensor deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting sensor", error });
    }
};

module.exports = { createSensor, getAllSensors, updateSensor, deleteSensor }
