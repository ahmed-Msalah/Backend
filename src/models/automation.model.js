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
    type: Schema.Types.Mixed,
    required: true,
  }
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
      enum: ['turn_on', 'turn_off'],
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
    required: true,
  },
  state: {
    type: Schema.Types.Mixed,
    required: true,
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
