const Category = require('../models/category.device.model');

const getDeviceCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = getDeviceCategories;
