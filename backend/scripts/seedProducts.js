require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const categoryNames = ["Paper", "Writing", "Notebooks", "Art Supplies"];

  const categoryDocs = {};
  for (const name of categoryNames) {
    const doc = await Category.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryDocs[name] = doc;
  }

  const products = [
    {
      name: "A4 Bond Paper Ream",
      brand: "Studyzie Essentials",
      description: "Premium 80gsm paper, 500 sheets.",
      imageKey: "a4",
      price: 225,
      category: categoryDocs["Paper"]._id,
      countInStock: 42,
      isFeatured: true
    },
    {
      name: "Blue Ballpen Pack (12pcs)",
      brand: "Studyzie Essentials",
      description: "Smooth-writing ballpens with quick-dry ink.",
      imageKey: "ballpen",
      price: 89,
      category: categoryDocs["Writing"]._id,
      countInStock: 68,
      isFeatured: true
    },
    {
      name: "Spiral Notebook",
      brand: "Studyzie Essentials",
      description: "Durable cover notebook with ruled pages.",
      imageKey: "notebook",
      price: 65,
      category: categoryDocs["Notebooks"]._id,
      countInStock: 55,
      isFeatured: true
    },
    {
      name: "No.2 Pencil Set (10pcs)",
      brand: "Studyzie Essentials",
      description: "High-quality pencils for writing and sketching.",
      imageKey: "pencil",
      price: 59,
      category: categoryDocs["Writing"]._id,
      countInStock: 76,
      isFeatured: true
    },
    {
      name: "Yellow Pad (80 leaves)",
      brand: "Studyzie Essentials",
      description: "Classic yellow pad for assignments and reviewers.",
      imageKey: "yellowpad",
      price: 72,
      category: categoryDocs["Paper"]._id,
      countInStock: 47,
      isFeatured: true
    },
    {
      name: "Oil Pastel Set (24 colors)",
      brand: "Studyzie Essentials",
      description: "Rich pigments for classroom art and poster projects.",
      imageKey: "oilpastel",
      price: 149,
      category: categoryDocs["Art Supplies"]._id,
      countInStock: 35,
      isFeatured: true
    }
  ];

  for (const item of products) {
    await Product.findOneAndUpdate(
      { name: item.name },
      item,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const count = await Product.countDocuments();
  console.log(`Seed completed. Products in DB: ${count}`);

  await mongoose.disconnect();
};

seed()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Seed failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // no-op
    }
    process.exit(1);
  });
