const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const auth = require("../config/auth");
const isUser = auth.isUser;

var url = require("url");

function getFormattedUrl(req) {
  return url.format({
    protocol: req.protocol,
    host: req.get("host"),
  });
}

// get user module
var User = require("../models/user");

// Get register
router.get("/register", function (req, res) {
  res.render("register", {
    title: "Register",
  });
});

// Post register
router.post("/register", function (req, res) {
  const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const phone = req.body.phone;
  const password = req.body.password;
  const password2 = req.body.password2;

  req.checkBody("name", "Name is required!").notEmpty();
  req.checkBody("email", "Email is required!").isEmail();
  req.checkBody("username", "Username is required!").notEmpty();
  req.checkBody("phone", "Phone Number is required!").notEmpty();
  req.checkBody("password", "Password is required!").notEmpty();
  req.checkBody("password2", "Password must match!").equals(password);

  var errors = req.validationErrors();

  if (errors) {
    res.render("register", {
      user: null,
      errors: errors,
      title: "Register",
    });
  } else {
    User.findOne({ username: username }, function (err, user) {
      if (err) console.log(err);

      if (user) {
        req.flash("danger", "Username Exists, choose another!");
        res.redirect("/users/register");
      } else {
        const user = new User({
          name: name,
          email: email,
          username: username,
          phone: phone,
          password: password,
          admin: 0,
          forgot_password_key: 10,
        });

        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) console.log(err);

            user.password = hash;

            user.save(function (err) {
              if (err) {
                console.log(err);
              } else {
                req.flash("success", "You are now registered");
                res.redirect("/users/login");
              }
            });
          });
        });
      }
    });
  }
});

// Get Login
router.get("/login", function (req, res) {
  if (res.locals.user) res.redirect("/");

  res.render("login", {
    title: "Login",
  });
});

// Post Login
router.post("/login", function (req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

// Get logout
router.get("/logout", function (req, res) {
  req.logOut();

  req.flash("success", "You are logged out!");
  res.redirect("/users/login");
});

// Get forgot password
router.get("/forgot-password", function (req, res) {
  res.render("forgot_password");
});

// Post forgot password
router.post("/forgot-password", function (req, res) {
  const { email } = req.body;

  User.findOne({ email: email }, function (err, user) {
    if (err) console.log(err);
    if (!user) {
      req.flash("danger", "No account found with this email!");
      res.redirect("/users/forgot-password");
    } else {
      req.flash("success", "Account found with this email!");
      res.redirect("/users/success-forgot-password");
      // console.log(user);

      const random = Math.floor(Math.random() * 1000000000 + 1);
      user.forgot_password_key = random;

      user.save();

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

      let uri = getFormattedUrl(req);

      let link =
        uri +
        "/users/change-password/" +
        user.id +
        "/" +
        user.forgot_password_key;
      let mailInfo = {
        from: "fidelitygadgets@gmail.com",
        to: email,
        subject: "Fidelity Gadgets' Reset Password",
        html: `
          <h2> Password Reset Link </h2> <br>
          <p>Thanks for your patience, Kindly click the text below to continue your process</p>
          <a href = ${link} > Click </a>
          `,
      };

      transporter.sendMail(mailInfo, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          // console.log(info);
        }
      });
    }
  });
});

// Get forgot password success
router.get("/success-forgot-password", function (req, res) {
  res.render("success_forgot_password");
});

// Get change password
router.get("/change-password/:id/:key", function (req, res) {
  const id = req.params.id;
  const key = req.params.key;
  User.findById(id, function (err, user) {
    if (err) console.log(err);

    if (user.forgot_password_key != key) {
      res.render("error", {
        error:
          "Error! The reset password link has expired! Request for another through forgot password!",
      });
    } else {
      res.render("change_password", {
        id: id,
        key: key,
        user: user,
      });
    }
  });
});

// Post change password
router.post("/change-password/:id/:key", function (req, res) {
  req.logOut();
  const id = req.params.id;
  const key = req.params.key;
  const password = req.body.password;
  const password2 = req.body.password2;

  req.checkBody("password", "Password is required!").notEmpty();
  req.checkBody("password2", "Password must match!").equals(password);

  var errors = req.validationErrors();

  if (errors) {
    res.render("change_password", {
      errors: errors,
      id: id,
    });
  } else {
    User.findOne({ id: id }, function (err, user) {
      if (err) console.log(err);

      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) console.log(err);

          User.findById(id, function (err, user) {
            if (err) console.log(err);
            user.name = user.name;
            user.email = user.email;
            user.username = user.username;
            user.phone = user.phone;
            user.password = hash;
            user.forgot_password_key = 10;

            user.save(function (err) {
              if (err) {
                console.log(err);
              } else {
                req.flash("success", "Password changed!");
                res.redirect("/users/login");
              }
            });
          });
        });
      });
    });
  }
});

// Get change e-mail
router.get("/change-email/:id", function (req, res) {
  const id = req.params.id;
  User.findById(id, function (err, user) {
    if (err) console.log(err);

    res.render("change_email", {
      id: id,
      user: user,
    });
  });
});

// Post change email
router.post("/change-email/:id", function (req, res) {
  req.logOut();
  const id = req.params.id;
  const email = req.body.email;

  req.checkBody("email", "E-mail is required!").notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    res.render("change_email", {
      errors: errors,
      id: id,
    });
  } else {
    User.findOne({ id: id }, function (err, user) {
      if (err) console.log(err);

      User.findById(id, function (err, user) {
        if (err) console.log(err);
        user.name = user.name;
        user.email = email;
        user.username = user.username;
        user.phone = user.phone;
        user.password = user.password;

        user.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            req.flash("success", "Email changed!");
            res.redirect("/users/" + id);
          }
        });
      });
    });
  }
});

// Get change phone
router.get("/change-phone/:id", function (req, res) {
  const id = req.params.id;
  User.findById(id, function (err, user) {
    if (err) console.log(err);

    res.render("change_phone", {
      id: id,
      user: user,
    });
  });
});

// Post change phone
router.post("/change-phone/:id", function (req, res) {
  req.logOut();
  const id = req.params.id;
  const phone = req.body.phone;

  req.checkBody("phone", "Phone Number is required!").notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    res.render("change_phone", {
      errors: errors,
      id: id,
    });
  } else {
    User.findOne({ id: id }, function (err, user) {
      if (err) console.log(err);

      User.findById(id, function (err, user) {
        if (err) console.log(err);
        user.name = user.name;
        user.email = user.email;
        user.username = user.username;
        user.phone = phone;
        user.password = user.password;

        user.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            req.flash("success", "Phone Number changed!");
            res.redirect("/users/" + id);
          }
        });
      });
    });
  }
});

// Get single User
router.get("/:id", isUser, function (req, res) {
  const id = req.params.id;
  User.findById(id, function (err, user) {
    if (err) console.log(err);

    res.render("user_account", {
      user,
    });
  });
});

// // Delete reference order
// router.get("/delete-reference/:id/:referenceId", function (req, res) {
//   const id = req.params.id;
//   const referenceId = req.params.referenceId;
//   User.update(id, { $pull: { reference: referenceId } }, function (err, user) {
//     if (err) console.log("There was an error deleting the reference", err);
//   });
// });

// Exports
module.exports = router;
