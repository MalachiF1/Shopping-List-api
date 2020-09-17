const express = require('express');
const router = express.Router();
const { requireSignin, authMiddleware, adminMiddleware } = require('../controllers/auth');
const { read, publicProfile, update } = require('../controllers/user');

router.get('/user/profile', requireSignin, authMiddleware, read);
router.get('/user/:username', publicProfile);
router.put('/user/update', requireSignin, authMiddleware, update);

module.exports = router;