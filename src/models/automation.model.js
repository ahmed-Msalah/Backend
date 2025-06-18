const mongoose = require("mongoose");
const { Schema } = mongoose;

const TriggerSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['SENSOR', 'SCHEDULE'],
  },
  sensorId: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: function () {
      return this.type === 'SENSOR';
    },
  },
  value: {
    type: String,
    required: function () {
      return this.type === 'SENSOR';
    },
  },
  time: {
    type: String,
    required: function () {
      return this.type === 'SCHEDULE';
    },
  },
}, { _id: false });

const ActionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['NOTIFICATION', 'DEVICE'],
  },
  data: {
    title: {
      type: String,
      required: function () {
        return this.type === 'NOTIFICATION';
      },
    },
    message: {
      type: String,
      required: function () {
        return this.type === 'NOTIFICATION';
      },
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: function () {
        return this.type === 'DEVICE';
      },
    },
    state: {
      type: String,
      enum: ['ON', 'OFF'],
      required: function () {
        return this.type === 'DEVICE';
      },
    }
  }
}, { _id: false });


const ConditionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['DEVICE', 'SENSOR'],
  },
  deviceId: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: function () {
      return this.type === 'DEVICE'
    }
  },
  deviceState: {
    type: String,
    enum: ["ON", "OFF"],
    required: function () {
      return this.type === 'DEVICE'
    }

  },
  sensorId: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: function () {
      return this.type === 'SENSOR'
    }
  },
  sensorValue: {
    type: Number,
    required: function () {
      return this.type === 'SENSOR'
    }

  }


}, { _id: false });

const AutomationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  triggers: {
    type: [TriggerSchema],
    required: true,
  },
  actions: {
    type: [ActionSchema],
    required: true,
  },
  conditions: {
    type: [ConditionSchema],
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


module.exports = mongoose.model("Automation", AutomationSchema);
