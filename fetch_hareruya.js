var client = require('cheerio-httpcli'),
    config = require('./config');

module.exports = {
    onlinepairingLegacy: function(done) {
        client.fetch("http://www.hareruyamtg.com/pairing/legacy/PL.html", {}, function (err, $, res) {
            done($);
        });
    },
    searchHistoryUseDeckLegacy: function(username, done) {
        client.fetch("http://www.hareruyamtg.com/jp/deck/search.aspx?format=Legacy&date_format=Legacy+-+Archive&archetype=&releasedt_type=1&min_releasedt=&max_releasedt=&player=" + username + "&name_je=&name_je_type=2&search.x=submit", {}, function (err, $, res) {
            done($);
        });
    }
};
