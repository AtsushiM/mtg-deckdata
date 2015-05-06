var config = require('../config'),
    util = require('../util'),
    storage;

function _contupUseCards(key, ary) {
    var i;

    for (i in ary) {
        // デッキで使用されてるカード毎に枚数を集計
        if (!storage.__usecards[key][i]) {
            storage.__usecards[key][i] = 0
        }
        storage.__usecards[key][i] += ary[i];
    }
}

function updateUseCardCount(deckcount) {
    var main = _sortUseCards('main', deckcount),
        side = _sortUseCards('side', deckcount),
        dd;

    storage.usecards = {
        date: storage.date,
        main: main,
        side: side
    };

    console.log('update: UseCards');
}

function _sortUseCards(key, deckcount) {
    var i,
        cards = [],
        count;

    // sortのため配列形式の変更
    for (i in storage.__usecards[key]) {
        count = storage.__usecards[key][i];
        cards.push({
            'name': i,
            'count': count,
            'adoption_rate': Math.round((count / deckcount) * 100) / 100
        });
    }
    cards.sort(util.sortArrayCountDesc);

    return cards;
}

module.exports = {
    makeTask: function(data) {
        storage = data;

        return function() {
            var i,
                details = storage.deckdetails.decks;

            for (i in details) {
                _contupUseCards('main', details[i].main);
                _contupUseCards('side', details[i].side);
            }

            updateUseCardCount(details.length);
        };
    }
};
