var client = require('cheerio-httpcli'),
    config = require('./config');

module.exports = {
    onlinepairingList: function(done) {
        client.fetch('http://monocolor.diarynote.jp/201511261151418674/', function(err, $, res) {
            done($);
        });
    },
    onlinepairing: function(path, done) {
        client.fetch(path, {}, function (err, $, res) {
            done($);
        });
    },
    searchHistoryUseDeckLegacy: function(username, format, done) {
        // 'http://www.hareruyamtg.com/jp/deck/search.aspx?format=Standard&date_format=&archetype=&releasedt_type=1&min_releasedt=&max_releasedt=&player=Ookawa+Yuusuke&name_je=&name_je_type=1&search.x=submit'
        // 'http://www.hareruyamtg.com/jp/deck/search.aspx?format=Modern&date_format=&archetype=&releasedt_type=1&min_releasedt=&max_releasedt=&player=Mizoue+Atsushi&name_je=&name_je_type=1&search.x=submit'
        // 'http://www.hareruyamtg.com/jp/deck/search.aspx?format=Legacy&date_format=&archetype=&releasedt_type=1&min_releasedt=&max_releasedt=&player=Mizoue+Atsushi&name_je=&name_je_type=2&search.x=submit'
        client.fetch('http://www.hareruyamtg.com/jp/deck/search.aspx?format=' + format + '&date_format=&archetype=&releasedt_type=1&min_releasedt=&max_releasedt=&player=' + username + '&name_je=&name_je_type=2&search.x=submit', {}, function (err, $, res) {
            done($);
        });
    }
};
