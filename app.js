var client = require('cheerio-httpcli'),
    wick = require('./wick').Wick,
    scrape = require('./scrape_scg'),
    util = require('./util'),
    api = require('./api'),
    db = require('./db'),
    port = util.getPort(),
    DeckData = db.getModel(),
    storage = db.getVolatileStorage(),
    TOPDECKLIMIT = 8;

api.activate(db.getSchema(), storage);

// データ更新
loopUpdateDecklistSCG();
function loopUpdateDecklistSCG() {
    updateDecklistSCG();
    setTimeout(updateDecklistSCG, 30 * 60 * 1000);
}

function updateDecklistSCG() {
    var $,
        labels = [],
        alldecks,
        sync = new wick.Sync({
            queue: [
                // 対象期間の作成
                function() {
                    storage.date = util.makeDateSpan();
                },
                // 基本データ取得
                function(done) {
                    DeckData.findOne({date: storage.date}, function (err, docs) {
                        // 存在しない場合はSCGからスクレイピングでデータを取得
                        if (docs === null) {
                            scrape.decklists(storage.date, function(deckdata) {
                                $ = deckdata;
                                done();
                            });
                        }
                        // 存在する場合はセット
                        else {
                            db.fetchStorage(docs);

                            sync.stop();
                            console.log('cache: load complete');
                        }
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
                    var topdecks = [],
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

                        if (deck['Finish'] <= TOPDECKLIMIT) {
                            topdecks.push(deck);
                        }
                        decks.push(deck);
                    });

                    alldecks = decks;
                    storage.decklists = {
                        date: storage.date,
                        decks: topdecks
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

    alldecks.sort(util.sortArrayCountDesc);

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

            setTimeout(function() {
                updateDeckDetailRecursiveSCG(decks, pointer + 1, done);
            }, 1000);
        });
    }
    else {
        storage.deckdetails = {
            date: storage.date,
            decks: storage.__deckdetails
        };

        console.log(decks.decks.length);

        console.log('update: DeckDetail');
        updateUseCardCount(decks.decks.length);
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

function updateUseCardCount(deckcount) {
    var main = _sortUseCards('main', deckcount),
        side = _sortUseCards('side', deckcount),
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
