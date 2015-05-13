var util = require('./util'),
    db = require('./db'),
    http = require('http'),
    express = require('express'),
    app = express(),
    storage;

function makeAPI(name) {
    app.get('/' + name, function(req, res) {
        // queryにdateがない場合はメモリ上のデータをそのまま返す
        if (!req.query.date) {
            return res.json(storage[name]);
        }

        // 日付が指定されている場合はdbからデータ取得
        date = util.makeDateSpan(req.query.date);
        db.getCache(db.getModel(), date, function(result) {
            res.json(result ? result[name] : {});
        });
    });
}

module.exports = {
    activate: function(schema, deckdata) {
        var i;

        // 最新データのオンメモリストレージ
        storage = deckdata;

        for (i in schema) {
            makeAPI(i);
        }

        // API起動
        http.createServer(app).listen(util.getPort());
    }
};
