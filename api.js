var util = require('./util'),
    db = require('./db'),
    fetch = require('./fetch_hareruya'),
    http = require('http'),
    express = require('express'),
    app = express(),
    storage;

function makeAPI(name) {
    app.get('/' + name, function(req, res) {
        var date;

        // queryにdateがない場合はメモリ上のデータをそのまま返す
        if (!req.query.date) {
            return res.json(storage.get(name));
        }

        // 日付が指定されている場合はdbからデータ取得
        date = util.makeDateSpan(req.query.date);
        db.loadCache(db.getModel(), date, function(result) {
            res.json(result ? result.get(name) : {});
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

        // onlinepairing
        app.get('/onlinepairinglist', function(req, res) {
            fetch.onlinepairingList(function($) {
                var lists = $('#main .body').text().split(','),
                    i,
                    tmp,
                    result = [];

                for (i in lists) {
                    tmp = lists[i].split(':');
                    result.push({
                        'name': tmp[0],
                        'url': tmp[1] + ':' + tmp[2]
                    });
                }

                res.json(result);
            });
        });
        app.get('/onlinepairing', function(req, res) {
            var path = req.query.path;

            fetch.onlinepairing(path, function($) {
                res.json(util.parseOnlinePairing($));
            });
        });
        app.get('/usedeckhistroy', function(req, res) {
            var username = req.query.username;

            fetch.searchHistoryUseDeckLegacy(username, function($) {
                var $boxs = $('#deckSearchResult .deckBox'),
                    i,
                    history = [],
                    deckname = '';

                $boxs.each(function() {
                    deckname = $(this).find('.deckTitle').text();
                    deckname = deckname.split('/').pop();

                    history.push({
                        'name': deckname,
                        'date': $(this).find('.date').text(),
                        'tournament': $(this).find('.tournament').text(),
                        'link': 'http://www.hareruyamtg.com' + $(this).parent().attr('href')
                    });
                });

                res.json({
                    'user': username,
                    'deckhistory': history
                });
            });
        });

        // API起動
        http.createServer(app).listen(util.getPort());
    }
};
