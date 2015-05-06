var config = require('./config'),
    wick = require('./wick').Wick,
    scrape = require('./fetch_scg'),
    util = require('./util'),
    api = require('./api'),
    db = require('./db'),
    format = require('./dataformat'),
    port = util.getPort(),
    DeckData = db.getModel(),
    storage = db.getVolatileStorage();

api.activate(db.getSchema(), storage);

// データ更新
loopUpdateDecklistSCG();
function loopUpdateDecklistSCG() {
    updateDecklistSCG();
    setTimeout(updateDecklistSCG, config.UPDATE_SPAN);
}

function updateDecklistSCG() {
    var $,
        labels = [],
        sync = new wick.Sync({
            queue: [
                // 対象期間の作成
                function() {
                    storage.date = util.makeDateSpan();
                },
                // キャッシュが存在する場合はメモリ上に展開
                function(done) {
                    db.loadCache(DeckData, storage.date, function(result) {
                        // // 存在する場合はタスク終了
                        // if (result === true) {
                        //     sync.stop();
                        //     console.log('cache: load complete');
                        //
                        //     return;
                        // }

                        // 存在しない場合は次へ
                        done();
                    });
                },
                // decklistsのデータを作成
                format.taskDecklists(storage),
                // decktypecountのデータを作成
                format.taskDecktypecount(storage),
                function(done) {
                    storage.__deckdetails = [];
                    storage.__usecards = {
                        main: {},
                        side: {}
                    };

                    updateDeckDetailRecursiveSCG(storage.decklists, 0, done);
                }
            ],
            oncomplete: function() {
                console.log('success');
            }
        });

    sync.start();
}
function updateDeckDetailRecursiveSCG(decks, pointer, done) {
    var deck = decks.decks[pointer];

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
