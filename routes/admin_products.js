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

// get product module
let Product = require("../models/product");

// get category module
let Category = require("../models/category");

// GET Admin products index
router.get("/", isAdmin, async function (req, res) {
  const query = {};
  const sort = { _id: -1 };
  let count;

  Product.countDocuments(function (err, c) {
    count = c;
  });

  const products = await Product.find(query).sort(sort).limit(25);

  const totalPages = Math.ceil(count / 25);
  const page = 1;

  res.render("../admin/products", {
    products: products,
    count: count,
    totalPages: totalPages,
    page: page,
  });
});

// Get Admin product pages
router.get("/page/:page/:totalPages", async function (req, res) {
  const { page, totalPages } = req.params;
  const limit = 25;
  const skip = parseInt(parseInt(page) * limit - 25);

  if (page == 1) {
    res.redirect("/admin/products");
  }

  let count;

  const products = await Product.find()
    .sort({ _id: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  count = await Product.find().countDocuments(function (err, c) {
    count = c;
  });

  res.render("../admin/products", {
    products: products,
    page: page,
    totalPages: totalPages,
    count: count,
  });
});

// GET add product
router.get("/add-product", isAdmin, function (req, res) {
  let title = "";
  let desc = "";
  let price = "";

  Category.find(function (err, categories) {
    res.render("../admin/add_product", {
      title: title,
      desc: desc,
      categories: categories,
      price: price,
    });
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

  // if (!req.files || Object.keys(req.files).length === 0) {
  //     req.flash('danger', 'No image added!');
  //     return Category.find(function(err, categories){
  //         res.render('../admin/add_product', {
  //             errors: errors,
  //             title:title,
  //             desc:desc,
  //             categories: categories,
  //             price:price
  //         });

  //     });
  // }

  req.checkBody("title", "Title must have a value").notEmpty();
  req.checkBody("desc", "Description must have a value").notEmpty();
  req.checkBody("price", "Price must have a value").isDecimal();
  req.checkBody("image", "You must upload an image").isImage(imageFile);

  let title = req.body.title;
  let slug = title.replace(/\s+/g, "-").toLowerCase();
  let desc = req.body.desc;
  let price = req.body.price;
  let category = req.body.category;

  let errors = req.validationErrors();

  if (errors) {
    Category.find(function (err, categories) {
      res.render("../admin/add_product", {
        errors: errors,
        title: title,
        desc: desc,
        categories: categories,
        price: price,
      });
    });
  } else {
    Product.findOne({ slug: slug }, function (err, product) {
      if (product) {
        req.flash("danger", "Product title exists, choose another.");
        Category.find(function (err, categories) {
          res.render("../admin/add_product", {
            title: title,
            desc: desc,
            categories: categories,
            price: price,
          });
        });
      } else {
        let price2 = parseFloat(price).toFixed(2);
        let product = new Product({
          title: title,
          slug: slug,
          desc: desc,
          price: price2,
          category: category,
          image: imageFile,
        });

        product.save(function (err) {
          if (err) return console.log(err);

          // mkdirp("public/product_images/" + product._id , function(err){
          //     console.log(err);
          // });
          // mkdirp("public/product_images/" + product._id + "/gallery" , function(err){
          //     console.log(err);
          // });
          // mkdirp("public/product_images/" + product._id + "/gallery/thumbs" , console.error());

          // mkdirp("public/product_images/" + product._id)
          // .catch(console.log(err));

          // mkdirp("public/product_images/" + product._id + "/gallery")
          // .catch(console.log(err));

          // mkdirp("public/product_images/" + product._id + "/gallery/thumbs")
          // .catch(console.log(err));

          fs.mkdir(
            "public/product_images/" + product._id,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/product_images/" + product._id + "/gallery",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );
          fs.mkdir(
            "public/product_images/" + product._id + "/gallery/thumbs",
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );

          if (imageFile != "") {
            let productImage = req.files.image;
            let Uploadpath =
              "public/product_images/" + product._id + "/" + imageFile;

            // let path1 = path.join(__dirname, "public/product_images/", product._id , productImage.name);
            // productImage.mv(path, function(err){
            //     return console.log(err);
            // });
            // let path1 = path.join(__dirname, "public/product_images/", product._id , productImage.name);
            productImage.mv(Uploadpath, (err) => {
              if (err) return console.log(err);
            });
          }

          req.flash("success", "Product added!");
          res.redirect("/admin/products");
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

  Category.find(function (err, categories) {
    Product.findById(req.params.id, function (err, p) {
      if (err) {
        console.log(err);
        res.redirect("/admin/products");
      } else {
        let galleryDir = "public/product_images/" + p._id + "/gallery";
        let galleryImages = null;

        fs.readdir(galleryDir, function (err, files) {
          if (err) {
            console.log(err);
          } else {
            galleryImages = files;

            res.render("../admin/edit_product", {
              title: p.title,
              errors: errors,
              desc: p.desc,
              categories: categories,
              category: p.category.replace(/\s+/g, "-").toLowerCase(),
              price: parseFloat(p.price).toFixed(2),
              image: p.image,
              galleryImages: galleryImages,
              id: p._id,
            });
          }
        });
      }
    });
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
  let category = req.body.category;
  let pimage = req.body.pimage;
  let id = req.params.id;

  let errors = req.validationErrors();

  if (errors) {
    req.session.errors = errors;
    res.redirect("/admin/products/edit-product/" + id);
  } else {
    Product.findOne({ slug: slug, _id: { $ne: id } }, function (err, p) {
      if (err) console.log(err);
      if (p) {
        req.flash("danger", "Product Title exists, choose another.");
        res.redirect("/admin/products/edit-product/" + id);
      } else {
        Product.findById(id, function (err, p) {
          if (err) console.log(err);
          p.title = title;
          p.slug = slug;
          p.desc = desc;
          p.price = parseFloat(price).toFixed(2);
          p.category = category;

          if (imageFile != "") {
            p.image = imageFile;
          }

          fs.mkdir(
            "public/product_images/" + id,
            { recursive: true },
            (err) => {
              if (err) throw err;
            }
          );

          p.save(function (err) {
            if (err) console.log(err);

            if (imageFile != "") {
              if (pimage != "") {
                fs.rm(
                  "public/product_images/" + id + "/" + pimage,
                  function (err) {
                    if (err) console.log(err);

                    let productImage = req.files.image;
                    let Uploadpath =
                      "public/product_images/" + id + "/" + imageFile;

                    productImage.mv(Uploadpath, (err) => {
                      if (err) return console.log(err);
                    });
                  }
                );
              }
            }

            req.flash("success", "Product edited!");
            res.redirect("/admin/products/edit-product/" + id);
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
  let path1 = "public/product_images/" + id + "/gallery/" + productImage.name;
  let thumbsPath =
    "public/product_images/" + id + "/gallery/thumbs/" + productImage.name;

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
    "public/product_images/" + req.query.id + "/gallery/" + req.params.image;
  let thumbImage =
    "public/product_images/" +
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
          res.redirect("/admin/products/edit-product/" + req.query.id);
        }
      });
    }
  });
});

// GET delete product
router.get("/delete-product/:id", isAdmin, function (req, res) {
  let id = req.params.id;
  let path1 = "public/product_images/" + id;

  fse.remove(path1, function (err) {
    if (err) {
      console.log(err);
    } else {
      Product.findByIdAndRemove(id, function (err) {
        if (err) return console.log(err);

        req.flash("success", "Product Deleted!");
        res.redirect("/admin/products");
      });
    }
  });
});

// Exports
module.exports = router;
