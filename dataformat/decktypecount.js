var config = require('../config'),
    util = require('../util');

module.exports = {
    makeTask: function(storage) {
        return function() {
            var name,
                deck,
                decks = [],
                alldecks = storage.get('decklists').decks;

            // 集計
            for (deck in alldecks) {
                name = alldecks[deck]['Deck'];
                if (!decks[name]) {
                    decks[name] = 0;
                }

                decks[name]++;
            }

            alldecks = [];
            // sortのため配列形式の変更
            for (deck in decks) {
                alldecks.push({
                    'name': deck,
                    'count': decks[deck]
                });
            }

            alldecks.sort(util.sortArrayCountDesc);

            // 配列形式を元のシンプルな形式に修正
            storage.set('decktypecount', {
                date: storage.get('date'),
                decks: alldecks
            });

            console.log('update: DeckTypeCount');
        };
    }
};
