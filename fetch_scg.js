var client = require('cheerio-httpcli'),
    config = require('./config');

module.exports = {
    decklists: function(date, done) {
        client.fetch(
            config.SCG_SEARCH_BASE
            + date.start + '&end_date='
            + date.end + '&start_num=0&limit=100', {}, function (err, $, res) {
            done($);
        });
    },
    deckdetail: function(deck, done) {
        client.fetch(deck['detaillink'], {}, function (err, $, res) {
            done($);
        });
    }
};
