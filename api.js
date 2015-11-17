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
        app.get('/harepairing', function(req, res) {
            fetch.onlinepairingLegacy(function($) {
                var $p = $('p'),
                    $lists = $('table tr'),
                    matches = [],
                    result = [],
                    round = 'X',
                    match,
                    i;

                // round数取得
                $p.each(function() {
                    var txt = $(this).text(),
                        match = txt.match(/^Round ([0-9]+$)/);

                    if (match) {
                        round = match[1];
                        return false;
                    }
                });

                $lists.each(function() {
                    var ret = [];
                    $(this).find('td').each(function() {
                        ret.push($(this).text());
                    });
                    matches.push(ret);
                });

                // 先頭はラベルなので削除
                matches.shift();

                for (i in matches) {
                    match = matches[i];
                    result.push({
                        'table': match[0],
                        'player': {
                            'name': match[1].replace(', ', ' '),
                            'point': match[2],
                        },
                        'opponent': {
                            'name': match[3].replace(', ', ' '),
                            'point': match[4],
                        },
                    });
                }

                res.json({
                    'round': round,
                    'matches': result
                });
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
                        'link': 'http://www.hareruyamtg.com/'.$(this).parent().attr('href').text()
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
