const { default: mongoose } = require("mongoose");
const Room = require("../models/room.model");
const Device = require("../models/device.model");


const createRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description } = req.body;


        console.log(name, description)
        if (!name) res.status(400).json({ message: "You Must Provide Name" });

        const newRoom = new Room({ name, description, userId });
        const createdRoom = await newRoom.save();

        if (createdRoom) res.status(200).json({ message: "Room Created Successfully", createdRoom });
        else res.status(400).json({ message: "Creation Failed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const updateRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const updatedData = req.body;

        const updatedRoom = await Room.findOneAndUpdate({ _id: roomId, userId }, updatedData, { new: true });
        if (updatedRoom) res.status(200).json({ message: "Room Updated Successfully", updatedRoom });
        else res.status(400).json({ message: "update Failed" });

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

const deleteRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        if (!roomId) {
            return res.status(400).json({ message: "Room ID is required" });
        }
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ message: "Invalid Room ID format" });
        }

        const deletedRoom = await Room.findOneAndDelete({ _id: roomId, userId });

        if (deletedRoom) res.status(200).json({ message: "Room Deleted Successfully" });
        else res.status(400).json({ message: "Deletion Failed" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({ message: "Invalid Room ID format" });
        }

        const roomData = await Room.findOne({ _id: roomId, userId });

        if (!roomData) {
            return res.status(404).json({ message: "Room not found" });
        }

        const devices = await Device.find({ roomId: roomId });

        res.status(200).json({ room: roomData, devices });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAllRoom = async (req, res) => {
    try {
        const userId = req.user.id;

        const roomsData = await Room.find({ userId });

        res.status(201).json({ rooms: roomsData });
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports = { createRoom, updateRoom, deleteRoom, getRoom, getAllRoom }