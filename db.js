var util = require('./util'),
    mongoose = require('mongoose'),
    db_local = 'localhost/mtg-deckdata',
    db_prod = 'heroku_app36379179:l9laqfs29muk5u1uvmie4627bm@ds031982.mongolab.com:31982/heroku_app36379179',
    storage = {
        date: {},
        decklists: {},
        deckdetails: {},
        __deckdetails: [],
        usecards: {},
        __usecards: {
            main: {},
            side: {}
        },
        decktypecount: {}
    },
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

function fetchStorage(docs) {
    if (docs === null) {
        return false;
    }

    storage.decklists = docs.decklists;
    storage.deckdetails = docs.deckdetails;
    storage.usecards = docs.usecards;
    storage.decktypecount = docs.decktypecount;

    return storage;
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
        model.findOne({date: storage.date}, function (err, docs) {
            var dd;

            if (docs !== null) {
                return false;
            }

            dd = new model({
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

            console.log('database: saved');

            done();
        });
    }
};
