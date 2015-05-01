var client = require('cheerio-httpcli'),
    mocky = require('mocky'),
    storage;

function resetStorage() {
    storage = {
        date: {
            start: '',
            end: ''
        },
        decklists: [],
        deckdetails: {},
        __deckdetails: [],
        usecards: {},
        __usecards: {
            main: {},
            side: {}
        },
        decktypecount: {}
    };
}

resetStorage();

// API起動
mocky.createServer([
    makeAPIConfig('decklists'),
    makeAPIConfig('deckdetails'),
    makeAPIConfig('usecards'),
    makeAPIConfig('decktypecount'),
]).listen(process.env.PORT || 3000);

function makeAPIConfig(name) {
    return {
        url: '/' + name,
        method: 'get',
        res: function (req, res) {
            return {
                status: 200,
                body: JSON.stringify(storage[name])
            };
        }
    };
}

// データ更新
loopUpdateDecklistSCG();
function loopUpdateDecklistSCG() {
    updateDecklistSCG();
    setTimeout(updateDecklistSCG, 12 * 60 * 60 * 1000);
}

function sortArrayCountDesc(a, b) {
    if (a['count'] < b['count']) {
        return 1;
    }
    if (a['count'] > b['count']) {
        return -1;
    }
    return 0;
}

function makeStringDate(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].join('-');
}

function fetchSCGDeckdata(action) {
    var now = new Date();
        before_1month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end_date = makeStringDate(now),
        start_date = makeStringDate(before_1month);

    storage.date = {
        start: start_date,
        end: end_date,
    };

    client.fetch( 'http://sales.starcitygames.com/deckdatabase/deckshow.php?&t[C1]=3&start_date=' + start_date + '&end_date=' + end_date + '&start_num=0&limit=100', {}, action);
}

function updateDecklistSCG() {
    fetchSCGDeckdata(function (err, $, res) {
        var $lists = $('#content table'),
            labels = [],
            decks = [],
            alldecks = [],
            deckid = 0;

        $lists.find('.deckdbheader').each(function () {
            labels.push($(this).text());
        });

        $('#content table tr').each(function() {
            var i = 0,
                val,
                deck = {},
                $deck;

            $(this).find('.deckdbbody, .deckdbbody2').each(function() {
                if (labels[i]) {
                    $deck = $(this);
                    val = $deck.text().trim().replace(/\&nbsp;/g, '');

                    switch (labels[i]) {
                        case 'Deck':
                            // link取得
                            deck['detaillink'] = $deck.find('a').attr('href');
                            break;
                        case 'Finish':
                            val = 1 * val.replace(/^([0-9]+)[a-z]+$/, '$1');
                            break;
                    }

                    deck[labels[i]] = val;
                }
                i++;
            });

            // デッキ情報以外が混ざりこむことを回避
            if (!deck['Location']) {
                return;
            }

            if (deck['Finish'] <= 3) {
                decks.push(deck);
            }
            alldecks.push(deck);
        });

        storage.decklists = {
            date: storage.date,
            decks: decks
        };
        console.log('update: DeckLists');

        storage.__deckdetails = [];
        storage.__usecards = {
            main: {},
            side: {}
        };
        updateDeckTypeCountSCG(alldecks);
        updateDeckDetailRecursiveSCG(storage.decklists, 0);
    });
}
function updateDeckTypeCountSCG(alldecks) {
    var name,
        deck,
        decks = [];

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

    alldecks.sort(sortArrayCountDesc);

    // 配列形式を元のシンプルな形式に修正
    storage.decktypecount = {
        date: storage.date,
        decks: alldecks
    };

    console.log('update: DeckTypeCount');
}
function updateDeckDetailRecursiveSCG(decks, pointer) {
    var deck = decks.decks[pointer];

    if (deck) {
        client.fetch(deck['detaillink'], {}, function (err, $, res) {
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

            storage.__deckdetails.push({
                meta: deck,
                main: main,
                side: side
            });

            _contupUseCards('main', main);
            _contupUseCards('side', side);

            updateDeckDetailRecursiveSCG(decks, pointer + 1);
        });
    }
    else {
        storage.deckdetails = {
            date: storage.date,
            decks: storage.__deckdetails
        };
        console.log('update: DeckDetail');
        updateUseCardCount();
    }
}
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

function updateUseCardCount() {
    var main = _sortUseCards('main'),
        side = _sortUseCards('side');

    storage.usecards = {
        date: storage.date,
        main: main,
        side: side
    };
    console.log('update: UseCards');
}
function _sortUseCards(key) {
    var i,
        cards = [];

    // sortのため配列形式の変更
    for (i in storage.__usecards[key]) {
        cards.push({
            'name': i,
            'count': storage.__usecards[key][i]
        });
    }
    cards.sort(sortArrayCountDesc);

    return cards;
}
