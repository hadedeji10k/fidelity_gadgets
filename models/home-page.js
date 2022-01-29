const mongoose = require("mongoose");

// Home-Page Schema
const HomePageSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
  },
  desc: {
    type: String,
    required: true,
  },
  type: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  discountPrice: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
  },
});

let HomePage = (module.exports = mongoose.model("HomePage", HomePageSchema));
