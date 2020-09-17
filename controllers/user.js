const User = require('../models/user');
const _ = require('lodash');
const formidable = require('formidable');
const fs = require('fs');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.read = (req, res) => {
    req.profile.hashed_password = undefined;
    return res.json(req.profile);
};

exports.publicProfile = (req, res) => {
    let username = req.params.username;
    let user;

    User.findOne({ username }).exec((err, userFromDB) => {
        if (err || !userFromDB) {
            return res.status(400).json({
                error: 'User not found'
            });
        }
        user = userFromDB;
        user.hashed_password = undefined;
        user.salt = undefined;
        res.json(user);
    });
};

exports.update = (req, res) => {
    let form = new formidable.IncomingForm();
    form.keepExtension = true;
    form.parse(req, (err, fields) => {
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
            let userId = req.auth._id;
            User.findById({ _id: userId }).exec((err, userFromDB) => {
                if (err || !userFromDB) {
                    return res.status(400).json({
                        error: 'User not found'
                    });
                }
                if(!userFromDB.authenticate(fields.oldPassword)) {
                    return res.status(400).json({
                        error: 'Old password is incorrect'
                    });
                } else {
                    user.save((err, result) => {
                        if (err) {
                            return res.status(400).json({
                                error: errorHandler(err)
                            });
                        }
                        user.hashed_password = undefined;
                        user.salt = undefined;
                        user.photo = undefined;
                        res.json(user);
                    });
                }
            });
        } else {
            user.save((err, result) => {
                if (err) {
                    return res.status(400).json({
                        error: errorHandler(err)
                    });
                }
                user.hashed_password = undefined;
                user.salt = undefined;
                user.photo = undefined;
                res.json(user);
            });
        }  
    });
};


