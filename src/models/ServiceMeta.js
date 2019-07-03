const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('ServiceMeta', {
    lastBlockSequence: {
        type: Number,
        default: 0,
    },
    lastBlockTime: {
        type: Date,
        default: null,
    },
    lastBlockNum: {
        type: Number,
        default: 0,
    },
});
