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
        date: Object,
        decklists: Object,
        deckdetails: Object,
        usecards: Object,
        decktypecount: Object
    };

function fetchStorage(docs) {
    if (docs === null) {
        return false;
    }

    storage.decklists = docs.decklists;
    storage.deckdetails = docs.deckdetails;
    storage.usecards = docs.usecards;
    storage.decktypecount = docs.decktypecount;

    return true;
}

module.exports = {
    getSchema: function() {
        return SCHEMA;
    },
    getVolatileStorage: function() {
        return storage;
    },
    getModel: function() {
        var port = util.getPort(),
            path = 'mongodb://'+ (port === 3000 ? db_local : db_prod),
            db = mongoose.connect(path),
            schemaconf = {},
            schema,
            i;

        schema = new mongoose.Schema(SCHEMA);

        return db.model('deckdata', schema);
    },
    loadCache: function(model, date, done) {
        model.findOne({date: date}, function (err, docs) {
            if (docs !== null) {
                done(fetchStorage(docs));
            }
        });
    }
};
