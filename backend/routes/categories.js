const express = require("express");
const Category = require("../models/Category");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch categories" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json(category);
  } catch (error) {
    return res.status(400).json({ message: "Invalid category id" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await Category.create({ name: name.trim() });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create category" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json(category);
  } catch (error) {
    return res.status(400).json({ message: "Failed to update category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.json({ success: true, message: "Category deleted" });
  } catch (error) {
    return res.status(400).json({ message: "Failed to delete category" });
  }
});

module.exports = router;
