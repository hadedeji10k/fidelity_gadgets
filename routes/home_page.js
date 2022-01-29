const express = require("express");
const router = express.Router();
const fs = require("fs");
const fse = require("fs-extra");

// get HomePage module
let HomePage = require("../models/home-page");

// Get single HomePage details
router.get("/:product", function (req, res) {
  let galleryImages = null;

  HomePage.findOne({ slug: req.params.product }, function (err, product) {
    if (err) {
      console.log(err);
    } else {
      let galleryDir = "public/home_images/" + product._id + "/gallery";

      fs.readdir(galleryDir, function (err, files) {
        if (err) {
          console.log(err);
        } else {
          galleryImages = files;

          res.render("home_page_product", {
            title: product.title,
            p: product,
            galleryImages: galleryImages,
          });
        }
      });
    }
  });
});

// Exports
module.exports = router;
