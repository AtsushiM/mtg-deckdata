var decklists = require('./dataformat/decklists'),
    decktypecount = require('./dataformat/decktypecount');

module.exports = {
    taskDecklists: decklists.makeTask,
    taskDecktypecount: decktypecount.makeTask,
};
