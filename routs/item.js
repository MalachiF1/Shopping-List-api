const express = require('express');
const router = express.Router();
const { create, remove, update, list, listSearch, searchHistory } = require('../controllers/item');

const { requireSignin, authMiddleware, adminMiddleware } = require('../controllers/auth');

// validators
const { runValidation } = require('../validators');
const { itemCreateValidator, itemUpdateValidator } = require('../validators/item');

router.post('/create-item', itemCreateValidator, runValidation, requireSignin, authMiddleware, create);
router.delete('/delete-item', requireSignin, authMiddleware, remove);
router.put('/update-item', itemUpdateValidator, runValidation, requireSignin, authMiddleware, update);
router.get('/list', requireSignin, authMiddleware, list);
router.get('/search', requireSignin, authMiddleware, listSearch);
router.get('/search-history', requireSignin, authMiddleware, searchHistory);

module.exports = router;
