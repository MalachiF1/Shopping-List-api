const User = require('../models/user');
const _ = require('lodash');
const formidable = require('formidable');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.read = (req, res) => {
    req.profile.hashed_password = undefined;
    return res.json(req.profile);
};

exports.publicProfile = async (req, res) => {
    let username = req.params.username;

    const user = await User.findOne({ username }).catch(() => null);
    if (!user) {
        return res.status(400).json({
            error: 'User not found'
        });
    }
    user.hashed_password = undefined;
    user.salt = undefined;
    res.json(user);
};

exports.update = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtension = true;
    form.parse(req, async (err, fields) => {
        if (err) {
            return res.status(400).json({
                error: 'Somthing went wrong'
            });
        }
        let user = req.profile;
        let existingRole = user.role;
        let existingEmail = user.email;

        user = _.extend(user, fields);
        user.role = existingRole;
        user.email = existingEmail;

        if(fields.password && fields.password.length < 6) {
            return res.status(400).json({
                error: 'Password should be min 6 characters long'
            });
        }

        if(fields.password && !fields.oldPassword){
            return res.status(400).json({
                error: 'Please enter old password'
            });
        }
        if(fields.password && fields.oldPassword){
            const userFromDB = await User.findById(req.auth._id).catch(() => null);
            if (!userFromDB) {
                return res.status(400).json({
                    error: 'User not found'
                });
            }
            if(!userFromDB.authenticate(fields.oldPassword)) {
                return res.status(400).json({
                    error: 'Old password is incorrect'
                });
            }
        }
        try {
            await user.save();
        } catch (err) {
            return res.status(400).json({
                error: errorHandler(err)
            });
        }
        user.hashed_password = undefined;
        user.salt = undefined;
        user.photo = undefined;
        res.json(user);
    });
};

exports.getSettings = async (req, res) => {
    const user = await User.findById(req.auth._id).catch(() => null);
    if (!user) {
        return res.status(400).json({
            error: 'User not found'
        });
    }
    res.json(user.userSettings);
};

exports.updateSettings = async (req, res) => {
    const { theme } = req.body;
    const oldUser = await User.findById(req.auth._id).catch(() => null);
    if (!oldUser) {
        return res.status(400).json({
            error: 'User not found'
        });
    }

    if (theme === 'dark' || theme === 'light') {
        oldUser.userSettings.theme = theme;
    }

    try {
        await oldUser.save();
    } catch (err) {
        return res.status(400).json({
            error: errorHandler(err)
        });
    }
    res.json(oldUser.userSettings);
};
