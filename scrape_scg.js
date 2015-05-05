var client = require('cheerio-httpcli');

module.exports = {
    decklists: function(date, done) {
        client.fetch(
            'http://sales.starcitygames.com/deckdatabase/deckshow.php?&t[C1]=3&start_date='
            + date.start + '&end_date='
            + date.end + '&start_num=0&limit=100', {}, function (err, $, res) {
            done($);
        });
    }
};
