const express = require('express');
const router = express.Router();
const { 
    create, 
    remove, 
    update, 
    list, 
    listSearch,  
} = require('../controllers/item');

const { requireSignin, authMiddleware, adminMiddleware } = require('../controllers/auth');

// validators
const { runValidation } = require('../validators');
const { itemCreateValidator } = require('../validators/item');

router.post('/create-item', itemCreateValidator, runValidation, requireSignin, authMiddleware, create);
router.delete('/delete-item', requireSignin, authMiddleware, remove);
router.put('/update-item', requireSignin, authMiddleware, update);
router.get('/list', requireSignin, authMiddleware, list);
router.get('/search', requireSignin, authMiddleware, listSearch)

module.exports = router;