const { check } = require('express-validator');

exports.itemCreateValidator = [
    check('name')
        .not()
        .isEmpty()
        .withMessage('Name is required'),
    check('name')
        .isLength({max: 20})
        .withMessage('Name must be uder 20 characters long'),
    check('amount')
        .not()
        .isEmpty()
        .withMessage('Amount is required'),
    check('amount')
        .isInt({ min: 1 })
        .withMessage('Amount must be at least 1'),
    check('note')
        .isLength({max: 40})
        .withMessage('Note must be uder 20 characters long')
];