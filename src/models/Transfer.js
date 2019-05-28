const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Transfer',
    {
        sender: {
            type: String,
            required: true,
        },
        receiver: {
            type: String,
            required: true,
        },
        quantity: {
            amount: {
                type: Number,
                default: 0,
            },
            decs: {
                type: Number,
                default: 3,
            },
            sym: {
                type: String,
            },
        },
        block: {
            type: Number,
        },
        trx_id: {
            type: String,
        },
        timestamp: {
            type: Date,
        },
    },
    {
        index: [
            {
                fields: {
                    sender: 1,
                    receiver: 1,
                    _id: -1,
                },
                options: {
                    unique: false,
                },
            },
        ],
    }
);
