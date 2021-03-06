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
                    // 現在~1ヶ月前の日付を作成
                    storage.set('date', util.makeDateSpan());
               },
                // 最新日付のキャッシュが存在する場合はメモリ上に展開
                function(done) {
                    db.loadCache(DeckData, storage.get('date'), function(result) {
                        // 存在する場合はタスク終了
                        if (result !== false) {
                            sync.stop();
                            console.log('cache: load complete');

                            return;
                        }

                        // // 存在しない場合は次へ
                        done();
                    });
                },
                // decklistsのデータを作成
                format.taskDecklists(storage),
                // decktypecountのデータを作成
                format.taskDecktypecount(storage),
                // deckdetailsのデータを作成
                format.taskDeckdetails(storage),
                // usecardsのデータを作成
                format.taskUsecards(storage),
                function(done) {
                    db.saveCache(DeckData, done);
                }
            ],
            oncomplete: function() {
                console.log('success');
            }
        });

    sync.start();
}
