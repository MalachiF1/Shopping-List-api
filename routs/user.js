const express = require('express');
const router = express.Router();
const { requireSignin, authMiddleware, adminMiddleware } = require('../controllers/auth');
const { read, publicProfile, update, getSettings, updateSettings } = require('../controllers/user');


router.get('/user/get-settings', requireSignin, authMiddleware, getSettings);
router.get('/user/profile', requireSignin, authMiddleware, read);
router.put('/user/update', requireSignin, authMiddleware, update);
router.put('/user/update-settings', requireSignin, authMiddleware, updateSettings);
router.get('/user/:username', publicProfile);

module.exports = router;