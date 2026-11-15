const User = require('../models/user');
const shortId = require('shortid');
const jwt = require('jsonwebtoken');
const { expressjwt } = require('express-jwt');
const { errorHandler } = require('../helpers/dbErrorHandler');
// sendgrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const _ = require('lodash');

exports.preSignup = async (req, res) => {
    const { name, email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).catch(() => null);
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
};

exports.signup = (req, res) => {
    const token = req.body.token;
    if(token) {
        jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, async function(err, decoded) {
            if(err) {
                return res.status(401).json({
                    error: 'Expired link. Signup again'
                });
            }

            const { name, email, password } = jwt.decode(token);

            let username = shortId.generate();
            let profile = `${process.env.CLIENT_URL}/profile/${username}`;

            const user = new User({ name, email, password, profile, username });
            try {
                await user.save();
            } catch (err) {
                return res.status(401).json({
                    error: errorHandler(err)
                });
            }
            res.json({
                message: 'Signup success! Email has been sent to user informing them the account has been activated.'
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

            sgMail.send(emailData).catch(err => console.log(err));
        });
    } else {
        return res.json({
            message: 'Something went wrong. Try again.'
        });
    }
};

exports.signin = async (req, res) => {
    const { email, password } = req.body;
    //check if user exists
    const user = await User.findOne({ email }).catch(() => null);
    if(!user) {
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
    const { _id, username, name, role } = user;
    return res.json({
        token,
        user: { _id, username, name, email: user.email, role }
    });
};


exports.signout = (req, res) => {
    res.clearCookie('token')
    res.json({
        message: 'Signout success'
    });
};


exports.requireSignin = expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    requestProperty: "auth",
});

exports.authMiddleware = async (req, res, next) => {
    const user = await User.findById(req.auth._id).catch(() => null);
    if(!user) {
        return res.status(400).json({
            error: 'User not found'
        })
    }
    req.profile = user;
    next();
};

exports.adminMiddleware = async (req, res, next) => {
    const user = await User.findById(req.auth._id).catch(() => null);
    if(!user) {
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
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email }).catch(() => null);
    if(!user) {
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
    try {
        await user.updateOne({ resetPasswordLink: token });
    } catch (err) {
        return res.json({error: errorHandler(err)})
    }
    sgMail.send(emailData).then(sent => {
        return res.json({
            message: `Email has been sent to ${email}. Follow the instructions to reset your password, link expires in 10 minutes.`
        });
    }).catch(err => console.log(err));
};

exports.resetPassword = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;

    if(resetPasswordLink) {
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, async function(err, decoded) {
            if(err) {
                return res.status(401).json({
                    error: 'Expired link. Try again'
                });
            }
            let user = await User.findOne({ resetPasswordLink }).catch(() => null);
            if(!user) {
                return res.status(401).json({
                    error: 'Something went wrong. Try again later.'
                })
            }

            const updatedFields = {
                password: newPassword,
                resetPasswordLink: ''
            };

            user = _.extend(user, updatedFields);

            try {
                await user.save();
            } catch (err) {
                return res.status(400).json({
                    error: errorHandler(err)
                });
            }
            res.json({
                message: `Great! You can now login with your new password.`
            });
        });
    }
};
