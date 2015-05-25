var config = require('../config'),
    util = require('../util'),
    wick = require('../wick').Wick,
    scrape = require('../fetch_scg'),
    storage;

function updateDeckDetailRecursiveSCG(decks, pointer, done) {
    var deck = decks.decks[pointer],
        workdetails = storage.get('__deckdetails');

    if (deck) {
        scrape.deckdetail(deck, function ($) {
            var count = 0,
                main = {},
                side = {};

            $('.deck_listing2').find('li').each(function() {
                var line = $(this).text().trim().match(/^([0-9]+)\s(.+)$/),
                    name = line[2],
                    num = 1 * line[1];

                // デッキリスト
                count += 1 * num;
                // trueならサイドボード
                if (!main[name] && count <= 60) {
                    main[name] = num;
                }
                else {
                    side[name] = num;
                }
            });

            workdetails.push({
                meta: deck,
                main: main,
                side: side
            });

            // SCGへの連続アクセスを軽減するため1secおきにする
            setTimeout(function() {
                updateDeckDetailRecursiveSCG(decks, pointer + 1, done);
            }, 1000);
        });
    }
    else {
        storage.set('deckdetails', {
            date: storage.date,
            decks: workdetails
        });

        console.log('update: DeckDetail');
        done();
    }
}

module.exports = {
    makeTask: function(data) {
        storage = data;

        return new wick.Sync({
            queue: [
                function(done) {
                    storage.set('__deckdetails', []);

                    updateDeckDetailRecursiveSCG(storage.get('decklists'), 0, done);
                }
            ]
        });
    }
};
