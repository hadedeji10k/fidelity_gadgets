const express = require("express");
const router = express.Router();
const auth = require("../config/auth");
const isAdmin = auth.isAdmin;

// get Category module
let Category = require("../models/category");

// GET Category index
router.get("/", isAdmin, async function (req, res) {
  const query = {};
  const sort = { _id: -1 };
  let count;

  Category.countDocuments(function (err, c) {
    count = c;
  });

  const categories = await Category.find(query).sort(sort).limit(25);

  const totalPages = Math.ceil(count / 25);
  const page = 1;

  res.render("../admin/categories", {
    categories: categories,
    count: count,
    totalPages: totalPages,
    page: page,
  });
});

// Get Admin categories pages
router.get("/page/:page/:totalPages", async function (req, res) {
  const { page, totalPages } = req.params;
  const limit = 25;
  const skip = parseInt(parseInt(page) * limit - 25);

  if (page == 1) {
    res.redirect("/admin/categories");
  }

  let count;

  const categories = await Category.find()
    .sort({ _id: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  count = await Category.find().countDocuments(function (err, c) {
    count = c;
  });

  res.render("../admin/categories", {
    categories: categories,
    page: page,
    totalPages: totalPages,
    count: count,
  });
});

// GET add Category
router.get("/add-category", isAdmin, function (req, res) {
  let title = "";

  res.render("../admin/add_category", {
    title: title,
  });
});

// POST add category
router.post("/add-category", function (req, res) {
  req.checkBody("title", "Title must have a value").notEmpty();

  let title = req.body.title;
  let slug = title.replace(/\s+/g, "-").toLowerCase();

  let errors = req.validationErrors();
  if (errors) {
    res.render("../admin/add_category", {
      errors: errors,
      title: title,
    });
  } else {
    Category.findOne({ slug: slug }, function (err, category) {
      if (category) {
        req.flash("danger", "Category Title exists, choose another");
        res.render("../admin/add_category", {
          title: title,
          slug: slug,
        });
      } else {
        let category = new Category({
          title: title,
          slug: slug,
        });

        category.save(function (err) {
          if (err) return console.log(err);

          Category.find(function (err, categories) {
            if (err) {
              console.log(err);
            } else {
              req.app.locals.categories = categories;
            }
          });

          req.flash("success", "Category added!");
          res.redirect("/admin/categories");
        });
      }
    });
  }
});

// GET edit category
router.get("/edit-category/:id", isAdmin, function (req, res) {
  Category.findById(req.params.id, function (err, category) {
    if (err) return console.log(err);

    res.render("../admin/edit_category", {
      title: category.title,
      id: category._id,
    });
  });
});

// POST edit category
router.post("/edit-category/:id", function (req, res) {
  req.checkBody("title", "Title must have a value").notEmpty();

  let title = req.body.title;
  let slug = title.replace(/\s+/g, "-").toLowerCase();
  let id = req.params.id;

  let errors = req.validationErrors();
  if (errors) {
    res.render("../admin/edit_category", {
      errors: errors,
      title: title,
      id: id,
    });
  } else {
    Category.findOne(
      { slug: slug, _id: { $ne: id } },
      function (err, category) {
        if (category) {
          req.flash("danger", "Category title exists, choose another");
          res.render("../admin/edit_category", {
            title: title,
            id: id,
          });
        } else {
          Category.findById(id, function (err, category) {
            if (err) {
              return console.log(err);
            }

            category.title = title;
            category.slug = slug;

            category.save(function (err) {
              if (err) return console.log(err);

              Category.find(function (err, categories) {
                if (err) {
                  console.log(err);
                } else {
                  req.app.locals.categories = categories;
                }
              });

              req.flash("success", "Category edited!");
              res.redirect("/admin/categories/edit-category/" + id);
            });
          });
        }
      }
    );
  }
});

// GET delete category
router.get("/delete-category/:id", isAdmin, function (req, res) {
  Category.findByIdAndRemove(req.params.id, function (err) {
    if (err) return console.log(err);

    Category.find(function (err, categories) {
      if (err) {
        console.log(err);
      } else {
        req.app.locals.categories = categories;
      }
    });

    req.flash("success", "Categoty Deleted!");
    res.redirect("/admin/categories/");
  });
});

// Exports
module.exports = router;
