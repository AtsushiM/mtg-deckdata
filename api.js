var util = require('./util'),
    mocky = require('mocky'),
    storage;

function makeAPIConfig(name) {
    return {
        url: '/' + name,
        method: 'get',
        res: function (req, res) {
            return {
                status: 200,
                body: JSON.stringify(storage[name])
            };
        }
    };
}

module.exports = {
    activate: function(schema, deckdata) {
        var apis = [],
            i;

        // 共有データ保持
        storage = deckdata;

        for (i in schema) {
            apis.push(makeAPIConfig(i));
        }

        // API起動
        mocky.createServer(apis).listen(util.getPort());
    }
};
