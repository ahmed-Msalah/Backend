const Device = require('../models/device.model');
const Room = require('../models/room.model');


const createDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, pinNumber, roomId, categoryId } = req.body;

        if (!name) res.status(500).json({ message: "Must Provide Device Name" });
        if (!categoryId) res.status(500).json({ message: "Must Provide Device Category" });
        if (!pinNumber) res.status(500).json({ message: "Must Provide Pin Number" });
        if (!roomId) res.status(500).json({ message: "Must Provide Room Id" });


        // Check If the Room Already Exist or not:
        const room = await Room.findOne({ _id: roomId, userId });
        if (!room) res.status(400).json({ message: "You Can't Add This Device For This Room" });

        // check if the pinNumber allready used for this user or not
        const pinNumberUsed = await Device.findOne({ roomId, pinNumber });
        if (pinNumberUsed) res.status(400).json({ message: "Pin Number aleady used try to use another one" });
        const newDevice = new Device({
            name,
            categoryId,
            description,
            pinNumber,
            roomId,
        });

        const deviceSaved = await newDevice.save();

        if (deviceSaved) res.status(201).json({ message: "Device Created Successfully", deviceSaved });


    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}


const updateDevice = async (req, res) => {

    try {
        const { deviceId } = req.params;
        const userId = req.user.id;
        const updatedData = req.body;

        const device = await Device.findById(deviceId);
        if (!device) res.status(404).json({ message: "Device Not Found" });

        const room = await Room.findById(device.roomId);
        if (!room) res.status(404).json({ messae: "Room Not Found" });

        if (userId !== room.userId.toString()) res.status(403).json({ message: "Unauthorized: You are not the owner of this device" })

        const updatedDevice = await Device.findOneAndUpdate({ _id: deviceId }, updatedData, { new: true });

        if (updatedDevice) res.status(200).json({ message: "Device updated Sucessfully", updatedDevice });
        else res.status(400).json({ message: "Updated Failed" });

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const deleteDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user.id;

        const device = await Device.findById(deviceId);
        if (!device) res.status(404).json({ message: "Device Not Found" });

        const room = await Room.findById(device.roomId);
        if (!room) res.status(404).json({ messae: "Room Not Found" });

        if (userId !== room.userId.toString()) res.status(403).json({ message: "Unauthorized: You are not the owner of this device" })

        const deletedDevice = await Device.findOneAndDelete({ _id: deviceId });

        if (deletedDevice) res.status(201).json({ message: "Device Deleted Sucessfully" });
        else res.status(400).json({ message: "Deleted Failed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getAllDevices = async (req, res) => {
    try {
        const { userId } = req.params;

        const rooms = await Room.find({ userId }).select("_id");
        const roomIds = rooms.map(room => room._id);

        const devices = await Device.find({ roomId: { $in: roomIds } }).select("_id pinNumber")

        res.status(200).json({ devices });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { createDevice, updateDevice, deleteDevice, getAllDevices }