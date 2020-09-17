const User = require('../models/user');
const shortId = require('shortid');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const { errorHandler } = require('../helpers/dbErrorHandler');
// sendgrid
const sgMail = require('@sendgrid/mail'); 
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const _ = require('lodash');

exports.preSignup = (req, res) => {
    const { name, email, password } = req.body;

    User.findOne({ email: email.toLowerCase() }, (err, user) => {
        if(user) {
            return res.status(400).json({
                error: 'Email is taken'
            });
        }
        const token = jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn: '1d' });

        const emailData = {
            to: process.env.EMAIL_TO,
            from: process.env.EMAIL_FROM,
            subject: `Account activation link`,
            html: `
                <p>Signup request from ${process.env.CLIENT_URL} - </p>
                <p>Name: ${name}</p>
                <p>Email: ${email}</p>
                <p>Please use the following link to activate ${email}'s account:</p>
                <p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
                <hr />
                <p>This email may contain sensetive informaition</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        };

        sgMail.send(emailData).then(sent => {
            return res.json({
                message: `Email has been sent to an admin. Please wait for your account to be activated.`
            });
        })
        .catch(err => console.log(err));
    });
};

exports.signup = (req, res) => {
    const token = req.body.token;
    if(token) {
        jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded) {
            if(err) {
                return res.status(401).json({
                    error: 'Expired link. Signup again'
                });
            }

            const { name, email, password } = jwt.decode(token);

            let username = shortId.generate();
            let profile = `${process.env.CLIENT_URL}/profile/${username}`;

            const user = new User({ name, email, password, profile, username });
            user.save((err, user) => {
                if(err) {
                    return res.status(401).json({
                        error: errorHandler(err)
                    });
                }
                return res.json({
                    message: 'Signup success! Email has been sent to user informing them the account has been activated.'
                });
            });
            const emailData = {
                to: email,
                from: process.env.EMAIL_FROM,
                subject: `Account activation link`,
                html: `
                    <p>Your account has been activated by an admin. Please signin.</p>
                    <p>${process.env.CLIENT_URL}/signin</p>
                    <hr />
                    <p>This email may contain sensetive informaition</p>
                    <p>${process.env.CLIENT_URL}</p>
                `
            };
    
            sgMail.send(emailData).then(sent => {
                return res.json({
                    message: ``
                });
            })
            .catch(err => console.log(err));
        });
    } else {
        return res.json({
            message: 'Something went wrong. Try again.'
        });
    }
};

exports.signin = (req, res) => {
    const { email, password } = req.body;
    //check if user exists
    User.findOne({email}).exec((err, user) => {
        if(err || !user) {
            return res.status(400).json({
                error: 'Email and password do not match'
            });
        }
        // authenticate
        if(!user.authenticate(password)) {
            return res.status(400).json({
                error: 'Email and password do not match'
            });
        }
        // generate a token and send to client
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, { expiresIn: '1d' })
        const { _id, username, name, email, role } = user;
        return res.json({
            token,
            user: { _id, username, name, email, role }
        });
    });
     
};


exports.signout = (req, res) => {
    res.clearCookie('token')
    res.json({
        message: 'Signout success'
    });
};


exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"], 
    userProperty: "auth",
  });

  exports.authMiddleware = (req, res, next) => {
      const authUserId = req.auth._id
      User.findById({_id: authUserId}).exec((err, user) => {
          if(err || !user) {
              return res.status(400).json({
                  error: 'User not found'
              })
          }
          req.profile = user;
          next();
      });
  };

  exports.adminMiddleware = (req, res, next) => {
    const adminUserId = req.auth._id
    User.findById({_id: adminUserId}).exec((err, user) => {
        if(err || !user) {
            return res.status(400).json({
                error: 'User not found'
            })
        }

        if(user.role !== 1) {
            return res.status(400).json({
                error: 'Admin resource. Access denied'
            });
        }

        req.profile = user;
        next();
    });
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;

    User.findOne({ email }, (err, user) => {
        if(err || !user) {
            return res.status(400).json({
                error: 'User with that email does not exist'
            });
        }

        const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' });

        //email
        const emailData = {
            to: email,
            from: process.env.EMAIL_FROM,
            subject: `Password reset link`,
            html: `
                <p>Please use the following link to reset your password:</p>
                <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                <hr />
                <p>This email may contain sensetive informaition</p>
                <p>https://shopping-list.fraenkel.name</p>
            `
        };

        // populating the db > user > resetPasswordLink
        return user.updateOne({ resetPasswordLink: token }, (err, success) => {
            if(err) {
                return res.json({error: errorHandler(err)})
            } else {
                sgMail.send(emailData).then(sent => {
                    return res.json({
                        message: `Email has been sent to ${email}. Follow the instructions to reset your password, link expires in 10 minutes.`
                    });
                }).catch(err => console.log(err));
            }
        });
    });
};

exports.resetPassword = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;

    if(resetPasswordLink) {
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decoded) {
            if(err) {
                return res.status(401).json({
                    error: 'Expired link. Try again'
                });
            }
            User.findOne({resetPasswordLink}, (err, user) => {
                if(err || !user) {
                    return res.status(401).json({
                        error: 'Something went wrong. Try again later.'
                    })
                }

                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                };

                user = _.extend(user, updatedFields);

                user.save((err, result) => {
                    if(err) {
                        return res.status(400).json({
                            error: errorHandler(err)
                        });
                    }
                    res.json({
                        message: `Great! You can now login with your new password.`
                    });
                });
            });
        });
    }
};


