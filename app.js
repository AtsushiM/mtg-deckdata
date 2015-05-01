var client = require('cheerio-httpcli'),
    mocky = require('mocky'),
    storage = {
        decklists: [],
        deckdetails: [],
        usecards: {},
        __usecards: {
            main: {},
            side: {}
        },
        decktypecount: {}
    };

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

function makeStringDate(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].join('-');
}

function updateDecklistSCG() {
    var now = new Date();
        before_1month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end_date = makeStringDate(now),
        start_date = makeStringDate(before_1month);

    client.fetch('http://sales.starcitygames.com/deckdatabase/deckshow.php?&t[C1]=3&start_date=' + start_date + '&end_date=' + end_date + '&start_num=0&limit=100', {}, function (err, $, res) {
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

        storage.decklists = decks;
        console.log('update: DeckLists');

        storage.deckdetails = [];
        storage.usecards = [];
        storage.__usecards = {
            main: {},
            side: {}
        };
        storage.decktypecount = {};
        updateDeckTypeCountSCG(alldecks);
        updateDeckDetailRecursiveSCG(storage.decklists.slice());
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

    alldecks.sort(function(a, b) {
        if (a['count'] < b['count']) {
            return 1;
        }
        if (a['count'] > b['count']) {
            return -1;
        }
        return 0;
    });

    // 配列形式を元のシンプルな形式に修正
    storage.decktypecount = alldecks;

    console.log('update: DeckTypeCount');
}
function updateDeckDetailRecursiveSCG(decks) {
    var deck = decks.shift(),
        count = 0,
        main = {},
        side = {},
        i;

    if (deck) {
        client.fetch(deck['detaillink'], {}, function (err, $, res) {
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

            for (i in main) {
                // デッキで使用されてるカード毎に枚数を集計
                if (!storage.__usecards['main'][i]) {
                    storage.__usecards['main'][i] = 0
                }
                storage.__usecards.main[i] += main[i];
            }
            for (i in side) {
                // デッキで使用されてるカード毎に枚数を集計
                if (!storage.__usecards.side[i]) {
                    storage.__usecards.side[i] = 0
                }
                storage.__usecards.side[i] += side[i];
            }

            storage.deckdetails.push({
                'main': main,
                'side': side
            });

            updateDeckDetailRecursiveSCG(decks);
        });
    }
    else {
        console.log('update: DeckDetail');
        updateUseCardCount();
    }
}

function updateUseCardCount() {
    var name,
        card,
        cards = {
            main: [],
            side: []
        };

    // sortのため配列形式の変更
    for (card in storage.__usecards.main) {
        cards.main.push({
            'name': card,
            'count': storage.__usecards.main[card]
        });
    }
    cards.main.sort(function(a, b) {
        if (a['count'] < b['count']) {
            return 1;
        }
        if (a['count'] > b['count']) {
            return -1;
        }
        return 0;
    });

    for (card in storage.__usecards.side) {
        cards.side.push({
            'name': card,
            'count': storage.__usecards.side[card]
        });
    }
    cards.side.sort(function(a, b) {
        if (a['count'] < b['count']) {
            return 1;
        }
        if (a['count'] > b['count']) {
            return -1;
        }
        return 0;
    });

    storage.usecards = cards;
    console.log('update: UseCards');
}
