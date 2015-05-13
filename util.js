function makeStringDate(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].join('-');
}

function makeDate(anydate) {
    if (typeof anydate !== 'string') {
        return new Date();
    }

    anydate = anydate.split(/[T:\-\+\/\s]/);

    return new Date(
        +anydate[0],
        anydate[1] - 1,
        +anydate[2],
        +anydate[3] || 0,
        +anydate[4] || 0,
        +anydate[5] || 0
    );
}

module.exports = {
    getPort: function() {
        return process.env.PORT || 3000;
    },
    makeDateSpan: function(date) {
        var now = makeDate(date);
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
