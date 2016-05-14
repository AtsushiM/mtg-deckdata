var config = require('../config'),
    util = require('../util'),
    storage;

function _contupUseCards(key, ary) {
    var i,
        workusecards = storage.get('__usecards'),
        target,
        tmp;

    for (i in ary) {
        // デッキで使用されてるカード毎に枚数を集計
        target = workusecards[key][i];
        if (!target) {
            target = workusecards[key][i] = {
                count: 0,
                indeck: {
                    use1: 0,
                    use2: 0,
                    use3: 0,
                    use4: 0,
                    use5Over: 0
                }
            };
        }

        target['count'] += ary[i];

        tmp = 'use' + ary[i];
        if (target['indeck'][tmp] === undefined) {
            tmp = 'use4Over';
        }

        target['indeck'][tmp]++;
    }

    storage.set('__usecards', workusecards);
}

function updateUseCardCount(deckcount) {
    var main = _sortUseCards('main', deckcount),
        side = _sortUseCards('side', deckcount),
        dd;

    storage.set('usecards', {
        date: storage.date,
        main: main,
        side: side
    });

    console.log('update: UseCards');
}

function truncationDecimal(num) {
    return Math.round(num * 100) / 100;
}

function _sortUseCards(key, deckcount) {
    var i, j,
        cards = [],
        count,
        target,
        indeck,
        usedeckcount,
        workusecards = storage.get('__usecards');

    // sortのため配列形式の変更
    for (i in workusecards[key]) {
        target = workusecards[key][i];
        count = target['count'];
        indeck = target['indeck'];
        usedeckcount = 0;

        for (j in indeck) {
            usedeckcount += indeck[j];
        }

        cards.push({
            'name': i,
            'count': count,
            'encounter_rate': truncationDecimal(count / deckcount),
            'adopotion_average': truncationDecimal(count / usedeckcount),
            'indeck': target['indeck']
        });
    }
    cards.sort(util.sortArrayCountDesc);

    return cards;
}

module.exports = {
    makeTask: function(data) {
        storage = data;

        storage.set('__usecards', {
            main: {},
            side: {}
        });

        return function() {
            var i,
                details = storage.get('deckdetails').decks;

            for (i in details) {
                _contupUseCards('main', details[i].main);
                _contupUseCards('side', details[i].side);
            }

            updateUseCardCount(details.length);
        };
    }
};
