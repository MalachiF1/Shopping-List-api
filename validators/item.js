const { check } = require('express-validator');

exports.itemCreateValidator = [
	check('name').not().isEmpty().withMessage('Name is required'),
	check('name').isLength({ max: 20 }).withMessage('Name must be under 20 characters long'),
	check('amount').not().isEmpty().withMessage('Amount is required'),
	check('amount').isFloat({ min: 0.0001 }).withMessage('Amount must be above 0'),
	check('note').isLength({ max: 40 }).withMessage('Note must be uder 20 characters long'),
];

exports.itemUpdateValidator = [
	check('name')
		.if(value => value)
		.isLength({ min: 1, max: 20 })
		.withMessage('Name must be between 1 and 20 characters long'),
	check('amount')
		.if(value => value)
		.isFloat({ min: 0.0001 })
		.withMessage('Amount must be above 0'),
	check('note')
		.if(value => value)
		.isLength({ max: 40 })
		.withMessage('Note must be uder 20 characters long'),
];
