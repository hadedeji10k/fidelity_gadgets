const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");

const app = express();

// body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// get Product module
let Product = require("../models/product");

// get Home Product module
let HomePage = require("../models/home-page");

// Get add product to cart
router.get("/add/:product", function (req, res) {
  let slug = req.params.product;

  Product.findOne({ slug: slug }, function (err, product) {
    if (err) {
      console.log(err);
    }

    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        title: slug,
        qty: 1,
        price: parseFloat(product.price).toFixed(2),
        image: "/product_images/" + product._id + "/" + product.image,
      });
    } else {
      let cart = req.session.cart;
      let newItem = true;

      for (let i = 0; i < cart.length; i++) {
        if (cart[i].title == slug) {
          cart[i].qty++;
          newItem = false;
          break;
        }
      }

      if (newItem) {
        cart = [];
        req.session.cart.push({
          title: slug,
          qty: 1,
          price: parseFloat(product.price).toFixed(2),
          image: "/product_images/" + product._id + "/" + product.image,
        });
      }
    }

    // console.log(req.session.cart);
    req.flash("success", "Product added to cart!");
    res.redirect("back");
  });
});

// GET Update product
router.get("/update/:product", function (req, res) {
  let slug = req.params.product;
  let cart = req.session.cart;
  let action = req.query.action;

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].title == slug) {
      switch (action) {
        case "add":
          cart[i].qty++;
          break;
        case "remove":
          if (cart[i].qty == 1) {
            cart.splice(i, 1);
          } else {
            cart[i].qty--;
          }
          break;
        case "clear":
          cart.splice(i, 1);
          if (cart.length == 0) delete req.session.cart;
          break;

        default:
          console.log("Update Problem");
          break;
      }
      break;
    }
  }

  req.flash("success", "Cart updated!");
  res.redirect("/cart/checkout");
});

// Get add home product to cart
router.get("/add/home-page/:product", function (req, res) {
  let slug = req.params.product;

  HomePage.findOne({ slug: slug }, function (err, product) {
    if (err) {
      console.log(err);
    }

    if (typeof req.session.cart == "undefined") {
      req.session.cart = [];
      req.session.cart.push({
        title: slug,
        qty: 1,
        price: parseFloat(product.price).toFixed(2),
        image: "/home_images/" + product._id + "/" + product.image,
      });
    } else {
      let cart = req.session.cart;
      let newItem = true;

      for (let i = 0; i < cart.length; i++) {
        if (cart[i].title == slug) {
          cart[i].qty++;
          newItem = false;
          break;
        }
      }

      if (newItem) {
        cart = [];
        req.session.cart.push({
          title: slug,
          qty: 1,
          price: parseFloat(product.price).toFixed(2),
          image: "/home_images/" + product._id + "/" + product.image,
        });
      }
    }

    // console.log(req.session.cart);
    req.flash("success", "Product added to cart!");
    res.redirect("back");
  });
});

// GET Update home product
router.get("/update/home-page/:product", function (req, res) {
  let slug = req.params.product;
  let cart = req.session.cart;
  let action = req.query.action;

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].title == slug) {
      switch (action) {
        case "add":
          cart[i].qty++;
          break;
        case "remove":
          if (cart[i].qty == 1) {
            cart.splice(i, 1);
          } else {
            cart[i].qty--;
          }
          break;
        case "clear":
          cart.splice(i, 1);
          if (cart.length == 0) delete req.session.cart;
          break;

        default:
          console.log("Update Problem");
          break;
      }
      break;
    }
  }

  req.flash("success", "Cart updated!");
  res.redirect("/cart/checkout");
});

// GET checkout page
router.get("/checkout", function (req, res) {
  const loggedIn = req.isAuthenticated() ? true : false;

  if (req.session.cart && req.session.cart.length == 0) {
    delete req.session.cart;
    res.redirect("/cart/checkout");
  } else {
    const user = res.locals.user;

    let userEmail, userName, username;

    if (req.isAuthenticated()) {
      userEmail = user.email;
      userName = user.name;
      username = user.username;
    } else {
      userEmail = "";
      userName = "";
      username = "";
    }

    // console.log(user);

    res.render("checkout", {
      title: "Checkout",
      cart: req.session.cart,
      loggedIn: loggedIn,
      userEmail: userEmail,
      userName: userName,
      username: username,
    });
  }
});

// Clear cart
router.get("/clear", function (req, res) {
  delete req.session.cart;
  req.flash("success", "Cart cleared!");
  res.redirect("/cart/checkout");
});

// Exports
module.exports = router;
