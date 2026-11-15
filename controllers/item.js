const Item = require('../models/item');
const CachedItem = require('../models/cachedItem');
const User = require('../models/user');
const slugify = require('slugify');
const { errorHandler } = require('../helpers/dbErrorHandler');

exports.create = async (req, res) => {
	let { name, amount, urgent, note, orderNum } = req.body;
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
	const user = await User.findById(postedById);
	postedBy = user.name;

	const items = await Item.find({});
	if (!orderNum) {
		if (items.length === 0) {
			orderNum = 0;
		} else {
			orderNum = items.sort((a, b) => b.orderNum - a.orderNum)[0].orderNum + 1; // makes it last in the list and doesn't make duplicates
		}
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

	let data;
	try {
		data = await item.save();
	} catch (err) {
		return res.status(400).json({
			error: errorHandler(err),
		});
	}
	addToHistory(data);
	res.json(data);
};

exports.list = async (req, res) => {
	let data;
	try {
		data = await Item.find({});
	} catch (err) {
		return res.status(400).json({
			error: errorHandler(err),
		});
	}
	res.json(data);
};

exports.remove = async (req, res) => {
	const slug = req.body.slug.toLowerCase();
	console.log(slug);

	let data;
	try {
		data = await Item.findOneAndDelete({ slug });
	} catch (err) {
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
};

exports.update = async (req, res) => {
	const slug = req.body.slug.toLowerCase();

	let oldItem;
	try {
		oldItem = await Item.findOne({ slug });
	} catch (err) {
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

	let result;
	try {
		result = await oldItem.save();
	} catch (err) {
		console.log(err);
		return res.status(400).json({
			error: errorHandler(err),
		});
	}
	UpdateHistory(result, slugBeforeMerge);
	res.json(result);
};

exports.listSearch = async (req, res) => {
	const { search } = req.query;
	if (search) {
		let items;
		try {
			items = await Item.find({
				$or: [{ name: { $regex: search, $options: 'i' } }, { note: { $regex: search, $options: 'i' } }],
			});
		} catch (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}
		res.json(items);
	}
};

exports.searchHistory = async (req, res) => {
	const { search } = req.query;
	if (search) {
		let cachedItems;
		try {
			cachedItems = await CachedItem.find({
				$or: [{ name: { $regex: search, $options: 'i' } }],
			});
		} catch (err) {
			return res.status(400).json({
				error: errorHandler(err),
			});
		}
		res.json(cachedItems);
	}
};

const addToHistory = async data => {
	const { name, amount, urgent, note, slug, link, postedById, postedBy } = data;

	let cachedItem = new CachedItem({ name, amount, urgent, note, slug, link, postedBy, postedById });

	const oldCachedItem = await CachedItem.findOne({ slug }).catch(err => {
		console.log('error:', errorHandler(err));
	});

	if (oldCachedItem) {
		oldCachedItem.name = cachedItem.name;
		oldCachedItem.amount = cachedItem.amount;
		oldCachedItem.urgent = cachedItem.urgent;
		oldCachedItem.note = cachedItem.note;
		oldCachedItem.slug = cachedItem.slug;
		oldCachedItem.slug = cachedItem.link;
		oldCachedItem.postedById = cachedItem.postedById;
		oldCachedItem.postedBy = cachedItem.postedBy;

		oldCachedItem.save().catch(err => {
			console.log('error:', errorHandler(err));
		});
	}

	if (!oldCachedItem) {
		cachedItem.save().catch(err => {
			console.log('error:', errorHandler(err));
		});
	}
};

const UpdateHistory = async (data, oldSlug) => {
	const { name, amount, urgent, note, slug, link, postedById, postedBy } = data;

	const oldCachedItem = await CachedItem.findOne({ slug: oldSlug }).catch(() => null);
	if (!oldCachedItem) {
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

	oldCachedItem.save().catch(err => {
		console.log('error:', errorHandler(err));
	});
};
