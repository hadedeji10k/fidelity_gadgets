const express = require("express");
const router = express.Router();
const fs = require("fs");
const fse = require("fs-extra");

// get Product module
let Product = require("../models/product");

// Get category module
let Category = require("../models/category");
const { Store } = require("express-session");

// Get all Product
router.get("/", async function (req, res) {
  const query = {};
  const sort = { _id: -1 };
  let count;

  const categories = await Category.find();

  const products = await Product.find(query).sort(sort).limit(25);

  count = await Product.find().countDocuments(function (err, c) {
    count = c;
  });

  const totalPages = Math.ceil(count / 25);
  const page = 1;

  res.render("all_products", {
    title: "All Products",
    products: products,
    count: count,
    totalPages: totalPages,
    page: page,
    categories: categories,
  });
});

// Get product pages
router.get("/page/:page/:totalPages", async function (req, res) {
  const { page, totalPages } = req.params;
  const limit = 25;
  const skip = parseInt(parseInt(page) * limit - 25);

  if (page == 1) {
    res.redirect("/products");
  }

  let count;

  const products = await Product.find()
    .sort({ _id: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  count = await Product.find().countDocuments(function (err, c) {
    count = c;
  });

  res.render("all_products", {
    title: "All Products",
    products: products,
    page: page,
    totalPages: totalPages,
    count: count,
  });
});

// Get products by category
router.get("/cat/:category", async function (req, res) {
  let catSlug = req.params.category;

  let count;
  const categories = await Category.find();

  Category.findOne({ slug: catSlug }, async function (err, cat) {
    const products = await Product.find({ category: catSlug })
      .sort({ _id: -1 })
      .limit(25);

    count = await Product.find({ category: catSlug }).countDocuments(function (
      err,
      c
    ) {
      count = c;
    });

    const totalPages = Math.ceil(count / 25);
    const page = 1;

    res.render("cat_products", {
      title: cat.title,
      catSlug: cat.slug,
      products: products,
      count: count,
      totalPages: totalPages,
      page: page,
      categories: categories
    });
  });
});

// Get product by category pages
router.get("/cat/:catSlug/:page/:totalPages", async function (req, res) {
  const { page, totalPages, catSlug } = req.params;
  const limit = 25;
  const skip = parseInt(parseInt(page) * limit - 25);

  if (page == 1) {
    res.redirect("/products/" + catSlug);
  }

  let count;

  Category.findOne({ slug: catSlug }, async function (err, cat) {
    const products = await Product.find({ category: catSlug })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    count = await Product.find({ category: catSlug }).countDocuments(function (
      err,
      c
    ) {
      count = c;
    });

    const totalPages = Math.ceil(count / 25);

    res.render("cat_products", {
      title: cat.title,
      catSlug: cat.slug,
      products: products,
      count: count,
      totalPages: totalPages,
      page: page,
    });
  });
});

// router.get("/get-products/:start/:limit", async function (req, res) {
//   const { start, limit } = req.params;

//   const products = await Product.find()
//     .sort({ _id: -1 })
//     .skip(parseInt(start))
//     .limit(parseInt(limit));

//   res.send(products);
// });

// product by cat using ajax
// router.get(
//   "/get-products-cat/:start/:limit/:catSlug",
//   async function (req, res) {
//     let count;

//     let { start, limit, catSlug } = req.params;

//     count = await Product.find({ category: catSlug }).countDocuments(function (err, c) {
//       count = c;
//     });

//     const products = await Product.find({ category: catSlug })
//       .sort({ _id: -1 })
//       .skip(parseInt(start))
//       .limit(parseInt(limit));

//     res.send(products);
//   }
// );

// Get single product details
router.get("/:category/:product", function (req, res) {
  let galleryImages = null;

  Product.findOne({ slug: req.params.product }, function (err, product) {
    if (err) {
      console.log(err);
    } else {
      let galleryDir = "public/product_images/" + product._id + "/gallery";

      fs.readdir(galleryDir, function (err, files) {
        if (err) {
          console.log(err);
        } else {
          galleryImages = files;

          res.render("product", {
            title: product.title,
            p: product,
            galleryImages: galleryImages,
          });
        }
      });
    }
  });
});

// Search products
// Get search page
router.get("/search", function (req, res) {
  res.render("search_page");
});

// Post search button
router.post("/search", async function (req, res) {
  const search = req.body.search;

  res.locals.user = req.user || null;

  let slug;

  let count;

  if (search == "") {
    slug = "09876543wedfgbnP-0--112bvcdert6yujmn=--bvcfrtyuijm/.'1vfgtyujm,";
  } else {
    slug = search.replace(/\s+/g, "-").toLowerCase();
  }
  const query = { slug: { $regex: slug } };

  const products = await Product.find(query).sort({ _id: -1 }).limit(25);

  count = await Product.find(query).countDocuments(function (err, c) {
    count = c;
  });

  const totalPages = Math.ceil(count / 25);
  const page = 1;

  res.render("search", {
    products: products,
    search: search,
    count: count,
    totalPages: totalPages,
    page: page,
  });
});

// Get search pages
router.get("/search/:search/:page/:totalPages", async function (req, res) {
  const { page, totalPages, search } = req.params;
  const limit = 25;
  const skip = parseInt(parseInt(page) * limit - 25);

  // if (page == 1) {
  //   res.redirect("/products/search");
  // }

  let count;
  let slug;

  if (search == "") {
    slug = "09876543wedfgbnP-0--112bvcdert6yujmn=--bvcfrtyuijm/.'1vfgtyujm,";
  } else {
    slug = search.replace(/\s+/g, "-").toLowerCase();
  }
  const query = { slug: { $regex: slug } };

  const products = await Product.find(query)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  count = await Product.find().countDocuments(function (err, c) {
    count = c;
  });

  res.render("search", {
    products: products,
    search: search,
    page: page,
    totalPages: totalPages,
    count: count,
  });
});

// Exports
module.exports = router;
