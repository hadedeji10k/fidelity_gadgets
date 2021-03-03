// jslint "esversion":6

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const config = require("./config/database");
const bodyParser = require("body-parser");
const session = require("express-session");
const expressValidator = require("express-validator");
const fileUpload = require("express-fileupload");
const passport = require("passport");
const nodemailer = require("nodemailer");

// Get Category Model
const Category = require("./models/category");
// Get Product Model
const Product = require("./models/product");
// Get User Model
const User = require("./models/user");

// mongodb deprecation warnings
mongoose.set("useUnifiedTopology", true);
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
// connect to db
mongoose.connect(config.database);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected to DB");
});

// init app to express module
const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// set Public folders
app.use(express.static(path.join(__dirname, "public")));

// set global error variable
app.locals.errors = null;

// Get all categories to header.ejs
Category.find(function (err, categories) {
  if (err) {
    console.log(err);
  } else {
    app.locals.categories = categories;
  }
});

// Express File-Upload middleware
app.use(fileUpload());

// body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Express-session middleware
app.use(
  session({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
    // cookie: { secure: true}
  })
);

// express validator middleware
app.use(
  expressValidator({
    errorFormatter: function (param, msg, value) {
      var namespace = param.split("."),
        root = namespace.shift(),
        formParam = root;

      while (namespace.length) {
        formParam += "[" + namespace.shift() + "]";
      }
      return {
        param: formParam,
        msg: msg,
        value: value,
      };
    },
    customValidators: {
      isImage: function (value, filename) {
        var extension = path.extname(filename).toLowerCase();
        switch (extension) {
          case ".jpg":
            return ".jpg";
          case ".jpeg":
            return ".jpeg";
          case ".png":
            return ".png";
          case "":
            return ".jpg";

          default:
            return false;
        }
      },
    },
  })
);

// Express messages middleware
app.use(require("connect-flash")());
app.use(function (req, res, next) {
  res.locals.messages = require("express-messages")(req, res);
  next();
});

// Passport config
require("./config/passport")(passport);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get("*", function (req, res, next) {
  res.locals.cart = req.session.cart;
  res.locals.user = req.user || null;
  // console.log(res.locals.user);
  next();
});

// Set routes
const cart = require("./routes/cart.js");
const users = require("./routes/users.js");
const products = require("./routes/products.js");
const homePage = require("./routes/home_page.js");
const adminCategories = require("./routes/admin_categories.js");
const adminProducts = require("./routes/admin_products.js");
const adminHomePage = require("./routes/admin_home_page.js");
const user = require("./models/user");

app.use("/cart", cart);
app.use("/users", users);
app.use("/products", products);
app.use("/home-page", homePage);
app.use("/admin/categories", adminCategories);
app.use("/admin/products", adminProducts);
app.use("/admin/home-page", adminHomePage);

// // get home route
// app.get("/", function (req, res) {
//   res.render("index");
// });

// get HomePage module
const HomePage = require("./models/home-page");

// Get /
app.get("/", async function (req, res) {
  const query = {};
  const sort = { _id: -1 };
  const limit = 6;

  const latestProducts = await Product.find(query).sort(sort).limit(limit);

  const homeProducts = await HomePage.find({}).sort(sort).limit(limit);

  res.render("index", {
    homeProducts: homeProducts,
    latestProducts: latestProducts,
  });
});

// get individual route
app.get("/admin", function (req, res) {
  res.render("admin_home");
});

app.get("/about-us", function (req, res) {
  res.render("about");
});

app.get("/services", function (req, res) {
  res.render("service");
});

// Get terms of services
app.get("/terms-of-services", function (req, res) {
  res.render("terms_of_services");
});
// Get Privacy & Policy
app.get("/privacy", function (req, res) {
  res.render("privacy_policy");
});

// Verify transaction
app.get("/verify_transaction", async function (req, res) {
  const reference = req.query.reference;
  const cart = req.query.cart;
  const delivery = req.query.deliveryLocation;

  const userId = res.locals.user.id;

  User.findById(userId, function (err, user) {
    // set date
    const d = new Date();
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const dateString = d.toLocaleDateString("en-US", options);
    const timeString = d.toLocaleTimeString("en-US");
    const date = `${dateString} [${timeString}]`;

    user.reference.push({
      referenceId: reference,
      date: date,
      // status: "success",
    });
    // console.log(user.reference);
    user.save();
  });

  const cartItems = res.locals.cart;
  const cartLength = cartItems.length;

  const user1 = await User.findById(userId);
  const userEmail = await user1.email;
  const userPhone = await user1.phone;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "fidelitygadgets@gmail.com",
      pass: "adedeji12345",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // send mail to self
  let mailInfo = {
    from: "fidelitygadgets@gmail.com",
    to: "fidelitygadgets@gmail.com",
    subject: "Fidelity Gadgets' Order",
    html: `
      <p> An Order has been received </p>
      <p> Reference ID is ${reference}</p>
      <p> Customer's email address: ${userEmail} </p>
      <p> Customer's Phone Number: ${userPhone} </p>
      <p> Customer's Delivery Location: ${delivery} </p>
      <p> Customer ordered ${cartLength}  products</p>
      <p> Orders are as follows: </p>
      <p> ${cart} </p>
      `,
  };

  transporter.sendMail(mailInfo, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      // console.log(info);
    }
  });

  // send mail to customer
  let mailInfo2 = {
    from: "fidelitygadgets@gmail.com",
    to: userEmail,
    subject: "Fidelity Gadgets' Order",
    html: `
      <p> Your Order has been received. </p>
      <p> Your reference ID is ${reference}.</p>
      <p>Your Orders are as follow: </p>
      <p> ${cart} </p>
      <p> For any further enquiries, please Contact 08162135402 or email us at fidelitygadgets@gmail.com</p>
      <p>Thanks for your Patronage</p>
      `,
  };

  transporter.sendMail(mailInfo2, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      // console.log(info);
    }
  });

  res.render("verify_transaction", {
    reference,
  });
});

// start the server
app.listen(3000, function () {
  console.log("Server is running at port 3000");
});
