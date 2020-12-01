const Item = require('../models/item');
const CachedItem = require('../models/cachedItem');
const User = require('../models/user');
const slugify = require('slugify');
const { errorHandler } = require('../helpers/dbErrorHandler');
const { isBuffer, isInteger } = require('lodash');
const cachedItem = require('../models/cachedItem');

exports.create = (req, res) => {
	const { name, amount, urgent, note } = req.body;
	let slug = slugify(name).toLowerCase();
	if (/[אבגדהוזחטיכלמנסעפצקרשת]/.test(name) || slug === '') {
		slug = [...name]
			.map(char => {
				if (char === ' ') {
					return '-';
				} else {
					return char;
				}
			})
			.filter(char => (/[!@#$%^&*()_-]/.test(char) === true ? false : true))
			.join('')
			.toLowerCase();
	}
	let postedById = req.auth._id;
	let linkSlug = name
		.split('')
		.filter(char => (/[!@#$%^&*()_-]/.test(char) === true ? false : true))
		.join('')
		.split(/\s+/)
		.join('+');
	let link = `https://www.shufersal.co.il/online/he/search?text=${linkSlug}`;
	let postedBy;
	User.findById({ _id: postedById }).exec((err, user) => {
		if (err || !user) {
			console.log(err);
		}
		postedBy = user.name;

		let orderNum;
		Item.find({}).exec((err, items) => {
			if (err) {
				console.log(err);
			}
			if (items.length === 0) {
				orderNum = 0;
			} else {
				orderNum = items.sort((a, b) => b.orderNum - a.orderNum)[0].orderNum + 1; // makes it last in the list and doesn't make duplicates
			}

			let item = new Item({
				name,
				amount,
				urgent,
				note,
				slug,
				link,
				postedBy,
				postedById,
				orderNum,
			});

			item.save((err, data) => {
				if (err) {
					return res.status(400).json({
						error: errorHandler(err),
					});
				}
				addToHistory(data);
				res.json(data);
			});
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
	console.log(slug);

	Item.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}
		if (!data) {
			console.log('***********');
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

		const { name, amount, urgent, note, orderNum } = req.body;

		if (name) {
			oldItem.name = name;
			let slug = slugify(name).toLowerCase();
			if (/[אבגדהוזחטיכלמנסעפצקרשת]/.test(name) || slug === '') {
				slug = [...name]
					.map(char => {
						if (char === ' ') {
							return '-';
						} else {
							return char;
						}
					})
					.filter(char => (/[!@#$%^&*()_-]/.test(char) === true ? false : true))
					.join('');
			}
			let linkSlug = name
				.split('')
				.filter(char => (/[!@#$%^&*()_-]/.test(char) === true ? false : true))
				.join('')
				.split(/\s+/)
				.join('+');
			oldItem.link = `https://www.shufersal.co.il/online/he/search?text=${linkSlug}`;
		}

		if (amount) {
			oldItem.amount = amount;
		}

		if (urgent !== undefined) {
			oldItem.urgent = urgent;
		}

		if (note !== undefined) {
			oldItem.note = note;
		}

		if (orderNum !== undefined) {
			oldItem.orderNum = orderNum;
		}

		oldItem.save((err, result) => {
			if (err) {
				console.log(err);
				return res.status(400).json({
					error: errorHandler(err),
				});
			}
			UpdateHistory(result, slugBeforeMerge);
			res.json(result);
		});
	});
};

exports.listSearch = (req, res) => {
	const { search } = req.query;
	if (search) {
		Item.find(
			{
				$or: [{ name: { $regex: search, $options: 'i' } }, { note: { $regex: search, $options: 'i' } }],
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

exports.searchHistory = (req, res) => {
	const { search } = req.query;
	if (search) {
		CachedItem.find(
			{
				$or: [{ name: { $regex: search, $options: 'i' } }],
			},
			(err, cachedItems) => {
				if (err) {
					return res.status(400).json({
						error: errorHandler(err),
					});
				}
				res.json(cachedItems);
			}
		);
	}
};

const addToHistory = data => {
	const { name, amount, urgent, note, slug, link, postedById, postedBy } = data;

	let cachedItem = new CachedItem({ name, amount, urgent, note, slug, link, postedBy, postedById });

	CachedItem.findOne({ slug }).exec((err, oldCachedItem) => {
		if (err) {
			console.log('error:', errorHandler(err));
		}

		if (oldCachedItem) {
			oldCachedItem.name = cachedItem.name;
			oldCachedItem.amount = cachedItem.amount;
			oldCachedItem.urgent = cachedItem.urgent;
			oldCachedItem.note = cachedItem.note;
			oldCachedItem.slug = cachedItem.slug;
			oldCachedItem.slug = cachedItem.link;
			oldCachedItem.postedById = cachedItem.postedById;
			oldCachedItem.postedBy = cachedItem.postedBy;

			oldCachedItem.save((err, result) => {
				if (err) {
					console.log('error:', errorHandler(err));
				}
			});
		}

		if (!oldCachedItem) {
			cachedItem.save((err, data) => {
				if (err) {
					console.log('error:', errorHandler(err));
				}
			});
		}
	});
};

const UpdateHistory = (data, oldSlug) => {
	const { name, amount, urgent, note, slug, link, postedById, postedBy } = data;

	CachedItem.findOne({ slug: oldSlug }).exec((err, oldCachedItem) => {
		if (err || !oldCachedItem) {
			console.log('cachedItem not found');
			return;
		}

		oldCachedItem.name = name;
		oldCachedItem.amount = amount;
		oldCachedItem.urgent = urgent;
		oldCachedItem.note = note;
		oldCachedItem.slug = slug;
		oldCachedItem.link = link;
		oldCachedItem.postedById = postedById;
		oldCachedItem.postedBy = postedBy;

		oldCachedItem.save((err, result) => {
			if (err) {
				console.log('error:', errorHandler(err));
			}
		});
	});
};
