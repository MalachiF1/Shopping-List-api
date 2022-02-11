const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const itemSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			trim: true,
			required: true,
			max: 20,
		},
		slug: {
			type: String,
			unique: true,
			index: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		urgent: {
			type: Boolean,
			default: false,
		},
		note: {
			type: String,
			max: 40,
		},
		orderNum: {
			type: Number,
		},
		link: {
			type: String,
		},
		postedById: {
			type: ObjectId,
			ref: 'User',
		},
		postedBy: {
			type: String,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
