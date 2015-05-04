var client = require('cheerio-httpcli'),
    mocky = require('mocky'),
    mongoose = require('mongoose'),
    wick = require('./wick').Wick,
    db = mongoose.connect('mongodb://localhost/mtg-deckdata'),
    DeckDataSchema = new mongoose.Schema({
        date: {
            start: String,
            end: String
        },
        decklists: Object,
        deckdetails: Object,
        usecards: Object,
        decktypecount: Object
    }),
    DeckData = db.model('deckdata', DeckDataSchema),
    storage;

function resetStorage() {
    storage = {
        date: {
            start: '',
            end: ''
        },
        decklists: {},
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

function fetchSCGDeckdata(done) {
    var now = new Date();
        before_1month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end_date = makeStringDate(now),
        start_date = makeStringDate(before_1month);

    storage.date = {
        start: start_date,
        end: end_date,
    };

    client.fetch('http://sales.starcitygames.com/deckdatabase/deckshow.php?&t[C1]=3&start_date=' + start_date + '&end_date=' + end_date + '&start_num=0&limit=100', {}, function (err, $, res) {
        done($);
    });
}

function updateDecklistSCG() {
    var $,
        labels = [],
        alldecks,
        sync = new wick.Sync({
        queue: [
            // 基本データ取得
            function(done) {
                fetchSCGDeckdata(function(deckdata) {
                    $ = deckdata;

                    done();
                });
            },
            // ラベル取得
            function() {
                var $lists = $('#content table');

                $lists.find('.deckdbheader').each(function () {
                    labels.push($(this).text());
                });
            },
            // デッキ情報
            function() {
                var top3 = [],
                    decks = [];

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
                        top3.push(deck);
                    }
                    decks.push(deck);
                });

                alldecks = decks;
                storage.decklists = {
                    date: storage.date,
                    decks: top3
                };
                console.log('update: DeckLists');
            },
            function() {
                updateDeckTypeCountSCG(alldecks);
            },
            function(done) {
                storage.__deckdetails = [];
                storage.__usecards = {
                    main: {},
                    side: {}
                };

                updateDeckDetailRecursiveSCG(storage.decklists, 0, done);
            }
        ],
        onprogress: function() {
        },
        oncomplete: function() {
            console.log('success');
        }
    });

    sync.start();
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
function updateDeckDetailRecursiveSCG(decks, pointer, done) {
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

            updateDeckDetailRecursiveSCG(decks, pointer + 1, done);
        });
    }
    else {
        storage.deckdetails = {
            date: storage.date,
            decks: storage.__deckdetails
        };
        console.log('update: DeckDetail');
        updateUseCardCount();
        done();
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
        side = _sortUseCards('side'),
        dd;

    storage.usecards = {
        date: storage.date,
        main: main,
        side: side
    };

    //{"date": {"start": storage.date.start}}
    DeckData.findOne({date: storage.date}, function (err, docs) {
        if (docs !== null) {
            return;
        }

        dd = new DeckData({
            date: storage.date,
            decklists: storage.decklists,
            deckdetails: storage.deckdetails,
            usecards: storage.usecards,
            decktypecount: storage.decktypecount
        });

        dd.save(function(err) {
            if (err) {
                console.log(err);
                return;
            }
        });
    });

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
