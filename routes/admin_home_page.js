const express = require("express");
const router = express.Router();
const mkdirp = require("mkdirp");
const fse = require("fs-extra");
const resizeImg = require("resize-img");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const auth = require("../config/auth");
const isAdmin = auth.isAdmin;

const app = express();

// Express File-Upload middleware
app.use(fileUpload());

// get HomePage module
let HomePage = require("../models/home-page");

// get category module
// let Category = require("../models/category");

// GET home-page index
router.get("/", isAdmin, async function (req, res) {
  let count;

  HomePage.countDocuments(function (err, c) {
    count = c;
  });

  const products = await HomePage.find();

  res.render("../admin/home_page", {
    products: products,
    count: count,
  });
});

// GET add product
router.get("/add-product", isAdmin, function (req, res) {
  let title = "";
  let desc = "";
  let price = "";
  let discountPrice = "";
  let type = "";

  res.render("../admin/add_home_page", {
    title: title,
    desc: desc,
    type: type,
    price: price,
    discountPrice: discountPrice,
  });
});

// POST add product
router.post("/add-product", function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    // let imageFile = typeof req.files.target_file !== "undefined" ? req.files.target_file.name : "";
    let imageFile = "";
  } else {
    let imageFile =
      typeof req.files.image !== "undefined" ? req.files.image.name : "";
  }

  req.checkBody("title", "Title must have a value").notEmpty();
  req.checkBody("desc", "Description must have a value").notEmpty();
  req.checkBody("price", "Price must have a value").isDecimal();
  req
    .checkBody("discountPrice", "Discount Price must have a value")
    .isDecimal();
  req.checkBody("image", "You must upload an image").isImage(imageFile);

  let title = req.body.title;
  let slug = title.replace(/\s+/g, "-").toLowerCase();
  let desc = req.body.desc;
  let price = req.body.price;
  let discountPrice = req.body.discountPrice;
  let type = req.body.type;

  let errors = req.validationErrors();

  if (errors) {
    res.render("../admin/add_home_page", {
      errors: errors,
      title: title,
      desc: desc,
      type: type,
      price: price,
      discountPrice: discountPrice,
    });
  } else {
    HomePage.findOne({ slug: slug }, function (err, product) {
      if (product) {
        req.flash("danger", "Product title exists, choose another.");
        res.render("../admin/add_home_page", {
          title: title,
          desc: desc,
          type: type,
          price: price,
          discountPrice: discountPrice,
        });
      } else {
        let price2 = parseFloat(price).toFixed(2);
        let discountPrice2 = parseFloat(discountPrice).toFixed(2);
        let homePage = new HomePage({
          title: title,
          slug: slug,
          desc: desc,
          price: price2,
          discountPrice: discountPrice2,
          type: type,
          image: imageFile,
        });

        homePage.save(function (err) {
          if (err) return console.log(err);

          fs.mkdir(
            "public/home_images/" + homePage.id,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/home_images/" + homePage._id + "/gallery",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/home_images/" + homePage._id + "/gallery/thumbs",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );

          if (imageFile != "") {
            let productImage = req.files.image;
            let Uploadpath =
              "public/home_images/" + homePage._id + "/" + imageFile;

            productImage.mv(Uploadpath, (err) => {
              if (err) return console.log(err);
            });
          }

          req.flash("success", "Product added!");
          res.redirect("/admin/home-page");
        });
      }
    });
  }
});

// GET edit product
router.get("/edit-product/:id", isAdmin, function (req, res) {
  let errors;

  if (req.session.errors) errors = req.session.errors;
  req.session.errors = null;

  HomePage.findById(req.params.id, function (err, p) {
    if (err) {
      console.log(err);
      res.redirect("/admin/home-page");
    } else {
      let galleryDir = "public/home_images/" + p._id + "/gallery";
      let galleryImages = null;

      fs.readdir(galleryDir, function (err, files) {
        if (err) {
          console.log(err);
        } else {
          galleryImages = files;

          res.render("../admin/edit_home_page", {
            title: p.title,
            errors: errors,
            desc: p.desc,
            type: p.type,
            price: parseFloat(p.price).toFixed(2),
            discountPrice: parseFloat(p.discountPrice).toFixed(2),
            image: p.image,
            galleryImages: galleryImages,
            id: p._id,
          });
        }
      });
    }
  });
});

// POST edit product
router.post("/edit-product/:id", function (req, res) {
  if (!req.files || Object.keys(req.files).length === 0) {
    // let imageFile = typeof req.files.target_file !== "undefined" ? req.files.target_file.name : "";
    let imageFile = "";
  } else {
    imageFile =
      typeof req.files.image !== "undefined" ? req.files.image.name : "";
  }

  req.checkBody("title", "Title must have a value").notEmpty();
  req.checkBody("desc", "Description must have a value").notEmpty();
  req.checkBody("price", "Price must have a value").isDecimal();
  req.checkBody("image", "You must upload an image").isImage(imageFile);

  let title = req.body.title;
  let slug = title.replace(/\s+/g, "-").toLowerCase();
  let desc = req.body.desc;
  let price = req.body.price;
  let discountPrice = req.body.discountPrice;
  let type = req.body.type;
  let pimage = req.body.pimage;
  let id = req.params.id;

  let errors = req.validationErrors();

  if (errors) {
    req.session.errors = errors;
    res.redirect("/admin/home-page/edit-product/" + id);
  } else {
    HomePage.findOne({ slug: slug, _id: { $ne: id } }, function (err, p) {
      if (err) console.log(err);
      if (p) {
        req.flash("danger", "Product Title exists, choose another.");
        res.redirect("/admin/home-page/edit-product/" + id);
      } else {
        HomePage.findById(id, function (err, p) {
          if (err) console.log(err);
          p.title = title;
          p.slug = slug;
          p.desc = desc;
          p.price = parseFloat(price).toFixed(2);
          p.discountPrice = parseFloat(discountPrice).toFixed(2);
          p.type = type;

          if (imageFile != "") {
            p.image = imageFile;
          }

          fs.mkdir("public/home_images/" + id, { recursive: true }, (err) => {
            if (err) throw err;
          });

          p.save(function (err) {
            if (err) console.log(err);

            if (imageFile != "") {
              if (pimage != "") {
                fs.rm(
                  "public/home_images/" + id + "/" + pimage,
                  function (err) {
                    if (err) console.log(err);

                    let productImage = req.files.image;
                    let Uploadpath =
                      "public/home_images/" + id + "/" + imageFile;

                    productImage.mv(Uploadpath, (err) => {
                      if (err) return console.log(err);
                    });
                  }
                );
              }
            }

            req.flash("success", "Product edited!");
            res.redirect("/admin/home-page/edit-product/" + id);
          });
        });
      }
    });
  }
});

// POST product gallery
router.post("/product-gallery/:id", function (req, res) {
  let productImage = req.files.file;
  let id = req.params.id;
  let path1 = "public/home_images/" + id + "/gallery/" + productImage.name;
  let thumbsPath =
    "public/home_images/" + id + "/gallery/thumbs/" + productImage.name;

  productImage.mv(path1, function (err) {
    if (err) console.log(err);
    resizeImg(fse.readFileSync(path1), { width: 100, height: 100 }).then(
      function (buf) {
        fse.writeFileSync(thumbsPath, buf);
      }
    );
  });

  res.sendStatus(200);
});

// GET delete image
router.get("/delete-image/:image", isAdmin, function (req, res) {
  let originalImage =
    "public/home_images/" + req.query.id + "/gallery/" + req.params.image;
  let thumbImage =
    "public/home_images/" +
    req.query.id +
    "/gallery/thumbs/" +
    req.params.image;

  fse.remove(originalImage, function (err) {
    if (err) {
      console.log(err);
    } else {
      fse.remove(thumbImage, function (err) {
        if (err) {
          console.log(err);
        } else {
          req.flash("success", "Image deleted!");
          res.redirect("/admin/home-page/edit-product/" + req.query.id);
        }
      });
    }
  });
});

// GET delete product
router.get("/delete-product/:id", isAdmin, function (req, res) {
  let id = req.params.id;
  let path1 = "public/home_images/" + id;

  fse.remove(path1, function (err) {
    if (err) {
      console.log(err);
    } else {
      HomePage.findByIdAndRemove(id, function (err) {
        if (err) return console.log(err);

        req.flash("success", "Product Deleted!");
        res.redirect("/admin/home-page");
      });
    }
  });
});

// Exports
module.exports = router;
