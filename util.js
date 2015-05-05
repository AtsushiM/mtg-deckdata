function makeStringDate(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].join('-');
}
module.exports = {
    makeDateSpan: function() {
        var now = new Date();
            before_1month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        return {
            start: makeStringDate(before_1month),
            end: makeStringDate(now),
        };
    },
    sortArrayCountDesc: function(a, b) {
        if (a['count'] < b['count']) {
            return 1;
        }
        if (a['count'] > b['count']) {
            return -1;
        }
        return 0;
    }
};
