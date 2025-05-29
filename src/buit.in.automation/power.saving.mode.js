const cron = require("node-cron");
const PowerSavingMode = require("../models/power.saving.mode.model");
const Room = require("../models/room.model");
const Device = require("../models/device.model");
const PowerUsage = require("../models/power.usage.model");



cron.schedule("*/15 * * * *", async () => {
  try {
    console.log(" Running power saving cron job...");

    const activeModes = await PowerSavingMode.find({ status: "ON" });

    for (const activeMode of activeModes) {
      const { userId, mode, usage } = activeMode;

      const rooms = await Room.find({ userId });
      const roomIds = rooms.map((room) => room._id);

      const devices = await Device.find({ roomId: { $in: roomIds } });

      for (const device of devices) {
        const { _id: deviceId, priority, status: deviceStatus } = device;

        const latestUsage = await PowerUsage.findOne({ deviceId }).sort({ createdAt: -1 });
        const deviceUsage = latestUsage?.usage ?? 0;

        if (deviceUsage < usage) {
          continue;
        }

        let shouldTurnOff = false;

        if (mode === "POWERSAVING") {
          if (priority === 1) shouldTurnOff = true;
        } else if (mode === "ULTRAPOWERSAVING") {
          if ([1, 2].includes(priority)) shouldTurnOff = true;
        } else if (mode === "EMERGENCY") {
          if ([1, 2, 3].includes(priority)) shouldTurnOff = true;
        }

        if (shouldTurnOff && deviceStatus === "ON") {
          await Device.updateOne({ _id: deviceId }, { status: "OFF" });
          console.log(`⚡ Device ${device.name} turned OFF (mode: ${modeType}, priority: ${priority})`);
        }
      }
    }

    console.log(" Power saving cron job completed.");
  } catch (error) {
    console.error("Cron job failed:", error.message);
  }
});

module.exports = {};
