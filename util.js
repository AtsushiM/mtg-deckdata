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
        var now = makeDate(date),
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
    },
    parseOnlinePairing: function($) {
        var $p = $('p'),
            $lists = $('table tr'),
            matches = [],
            result = [],
            round = 'X',
            match,
            i;

        // round数取得
        $p.each(function() {
            var txt = $(this).text(),
                match = txt.match(/^Round ([0-9]+)/);

            if (match) {
                round = match[1];
                return false;
            }
        });

        $lists.each(function() {
            var ret = [];
            $(this).find('td').each(function() {
                ret.push($(this).text());
            });
            matches.push(ret);
        });

        // 先頭はラベルなので削除
        matches.shift();

        for (i in matches) {
            match = matches[i];
            result.push({
                'table': match[0],
                'player': {
                    'name': match[1].replace(', ', ' '),
                    'point': match[2],
                },
                'opponent': {
                    'name': match[3].replace(', ', ' '),
                    'point': match[4],
                },
            });
        }

        return {
            'round': round,
            'matches': result
        };
    }
};
