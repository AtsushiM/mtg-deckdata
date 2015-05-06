var decklists = require('./dataformat/decklists'),
    decktypecount = require('./dataformat/decktypecount'),
    deckdetails = require('./dataformat/deckdetails'),
    usecards = require('./dataformat/usecards');

module.exports = {
    taskDecklists: decklists.makeTask,
    taskDecktypecount: decktypecount.makeTask,
    taskDeckdetails: deckdetails.makeTask,
    taskUsecards: usecards.makeTask,
};
