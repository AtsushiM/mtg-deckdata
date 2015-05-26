var util = require('./util'),
    wick = require('./wick').Wick,
    dataformat = require('./dataformat'),
    mongoose = require('mongoose'),
    db_local = 'localhost/mtg-deckdata',
    db_prod = 'heroku_app36379179:l9laqfs29muk5u1uvmie4627bm@ds031982.mongolab.com:31982/heroku_app36379179',
    storage = new wick.Storage(),
    SCHEMA = {
        date: {
            start: String,
            end: String
        },
        decklists: Object,
        deckdetails: Object,
        usecards: Object,
        decktypecount: Object
    },
    __model;

// schemaに合わせてデフォルト設定
storage.set('date', {});
storage.set('decklists', {});
storage.set('deckdetails', {});
storage.set('usecards', {});
storage.set('decktypecount', {});

// 作業用領域
storage.set('__deckdetails', []);
storage.set('__usecards', {});

function fetchStorage(docs) {
    if (docs === null) {
        return false;
    }

    storage.set('decklists', docs.decklists);
    storage.set('deckdetails', docs.deckdetails);
    storage.set('usecards', docs.usecards);
    storage.set('decktypecount', docs.decktypecount);

    updateSavedCache(docs);

    return storage;
}

function updateSavedCache(docs) {
    _updateSavedCacheUsecards(docs.usecards);
}
function _updateSavedCacheUsecards(data) {
    var tmp;

    tmp = data.main[0].indeck;

    if (
        !tmp ||
        !tmp.use1 === undefined
    ) {
        tpm = dataformat.taskUsecards(storage);
        tpm();
    }
}

module.exports = {
    getSchema: function() {
        return SCHEMA;
    },
    getVolatileStorage: function() {
        return storage;
    },
    getModel: function() {
        var path = 'mongodb://'+ (util.getPort() === 3000 ? db_local : db_prod),
            db;

        if (!__model) {
            db = mongoose.connect(path);
            __model = db.model('deckdata', new mongoose.Schema(SCHEMA));
        }

        return __model;
    },
    loadCache: function(model, date, done) {
        this.getCache(model, date, function(docs) {
            done(fetchStorage(docs));
        });
    },
    getCache: function(model, date, done) {
        model.findOne({"date.end": date.end, "date.start": date.start}, function (err, docs) {
            done(docs);
        });
    },
    saveCache: function(model, done) {
        model.findOne({date: storage.get('date')}, function (err, docs) {
            var dd,
                savedata = {
                    date: storage.get('date'),
                    decklists: storage.get('decklists'),
                    deckdetails: storage.get('deckdetails'),
                    usecards: storage.get('usecards'),
                    decktypecount: storage.get('decktypecount')
                };

            if (docs !== null) {
                model.update({date: storage.get('date')}, {$set: savedata}, {upsert: false, multi: true}, function(err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                });
            }
            else {
                dd = new model(savedata);
                dd.save(function(err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                });
            }

            console.log('database: saved');
            done();
        });
    }
};
