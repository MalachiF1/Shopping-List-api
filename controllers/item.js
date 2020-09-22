const Item = require('../models/item');
const User = require('../models/user');
const slugify = require('slugify');
const { errorHandler } = require('../helpers/dbErrorHandler');
const { isBuffer, isInteger } = require('lodash');
const { search } = require('../routs/item');

exports.create = (req, res) => {
	const { name, amount, urgent, note } = req.body;
	let slug = slugify(name).toLowerCase();
	if (slug === '') {
		slug = [...name]
			.map(char => {
				if (char === ' ') {
					return '-';
				} else {
					return char;
				}
			})
			.join('');
	}
	let postedById = req.auth._id;
	let postedBy;
	User.findById({ _id: postedById }).exec((err, user) => {
		if (err || !user) {
			console.log(err);
		}
		postedBy = user.name;

		let item = new Item({ name, amount, urgent, note, slug, postedBy, postedById });

		item.save((err, data) => {
			if (err) {
				return res.status(400).json({
					error: errorHandler(err),
				});
			}
			res.json(data);
		});
	});
};

exports.list = (req, res) => {
	Item.find({}).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}
		res.json(data);
	});
};

exports.remove = (req, res) => {
	const slug = req.body.slug.toLowerCase();

	Item.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}
		res.json({
			message: 'Item deleted successfully',
		});
	});
};

exports.update = (req, res) => {
	const slug = req.body.slug.toLowerCase();

	Item.findOne({ slug }).exec((err, oldItem) => {
		if (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}

		if (!oldItem) {
			return res.status(400).json({
				error: 'Item not found',
			});
		}

		let slugBeforeMerge = oldItem.slug;
		oldItem.slug = slugBeforeMerge;

		const { name, amount, urgent, note } = req.body;

		if (name) {
			oldItem.name = name;
			oldItem.slug = slugify(name).toLowerCase();
			if (oldItem.slug === '') {
				oldItem.slug = [...name]
					.map(char => {
						if (char === ' ') {
							return '-';
						} else {
							return char;
						}
					})
					.join('');
			}
		}

		if (amount) {
			if (amount != Math.floor(amount) || amount < 1) {
				return res.status(400).json({
					error: 'Please enter a valid amount',
				});
			}
			oldItem.amount = amount;
		}

		if (urgent !== undefined) {
			oldItem.urgent = urgent;
		}

		if (note !== undefined) {
			oldItem.note = note;
		}

		oldItem.save((err, result) => {
			if (err) {
				console.log(err);
				return res.status(400).json({
					error: errorHandler(err),
				});
			}
			res.json(result);
		});
	});
};

exports.listSearch = (req, res) => {
	const { search } = req.query;
	if (search) {
		Item.find(
			{
				$or: [
					{ name: { $regex: search, $options: 'i' } },
					{ note: { $regex: search, $options: 'i' } },
				],
			},
			(err, items) => {
				if (err) {
					return res.status(400).json({
						error: errorHandler(err),
					});
				}
				res.json(items);
			}
		);
	}
};
