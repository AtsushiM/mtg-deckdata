var client = require('cheerio-httpcli'),
    config = require('./config');

module.exports = {
    onlinepairing: function(format, done) {
        client.fetch("http://www.hareruyamtg.com/pairing/" + format + "/PL.html", {}, function (err, $, res) {
            done($);
        });
    }
};
