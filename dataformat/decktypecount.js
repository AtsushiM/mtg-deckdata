var config = require('../config'),
    util = require('../util');

function truncationDecimal(num) {
    return Math.round(num * 100) / 100;
}

module.exports = {
    makeTask: function(storage) {
        return function() {
            var tmp,
                name,
                deck,
                decks = [],
                alldecks = storage.get('decklists').decks,
                encounter = 0,
                encounter_max = 0;

            // 集計
            for (deck in alldecks) {
                name = alldecks[deck]['Deck'];
                tmp = 1 * alldecks[deck]['Finish'];

                if (!decks[name]) {
                    decks[name] = {
                        'count': 0,
                        'rank_total': 0,
                        'highest_rank': tmp,
                    };
                }

                decks[name]['count']++;
                decks[name]['rank_total'] += tmp;
                if (decks[name]['highest_rank'] < tmp) {
                    decks[name]['highest_rank'] = tmp;
                }
            }

            // 遭遇率を計算
            for (deck in decks) {
                tmp = decks[deck];
                // 最低がconfig.TOPDECKLIMITの為、count掛けしてtmp['rank_total']を引けば
                // 相対的に順位が高かったデッキほどencounterの値が高くなる
                encounter = config.TOPDECKLIMIT * tmp['count'] - tmp['rank_total'];

                // 最高順位でも補正を掛ける
                encounter += Math.floor(encounter * (config.TOPDECKLIMIT - tmp['highest_rank']));

                encounter_max += encounter;
                tmp['encounter_rate'] = encounter;
            }
            for (deck in decks) {
                tmp = decks[deck];
                tmp['encounter_rate'] = truncationDecimal(tmp['encounter_rate'] / encounter_max * 100);
            }

            alldecks = [];
            // sortのため配列形式の変更
            for (deck in decks) {
                tmp = decks[deck];

                alldecks.push({
                    'name': deck,
                    'count': tmp['count'],
                    'highest_rank' : tmp['highest_rank'],
                    'encounter_rate': tmp['encounter_rate']
                });
            }

            // alldecks.sort(util.sortArrayCountDesc);
            tmp = 'encounter_rate';
            alldecks.sort(function(a, b) {
                if (a[tmp] < b[tmp]) {
                    return 1;
                }
                if (a[tmp] > b[tmp]) {
                    return -1;
                }
                return 0;
            });

            storage.set('decktypecount', {
                date: storage.get('date'),
                decks: alldecks
            });

            console.log('update: DeckTypeCount');
        };
    }
};
