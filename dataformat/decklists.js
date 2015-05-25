var config = require('../config'),
    wick = require('../wick').Wick,
    scrape = require('../fetch_scg'),
    $,
    labels = [];

module.exports = {
    makeTask: function(storage) {
        return new wick.Sync({
            queue: [
                // データが存在しない場合はSCGからスクレイピングでデータを取得
                function(done) {
                    scrape.decklists(storage.get('date'), function(deckdata) {
                        $ = deckdata;
                        done();
                    });
                },
                // ラベル取得
                function() {
                    var $lists = $('#content table');

                    labels = [];
                    $lists.find('.deckdbheader').each(function () {
                        labels.push($(this).text());
                    });
                },
                // デッキ情報
                function() {
                    var topdecks = [],
                        decks = [];

                    $('#content table tr').each(function() {
                        var i = 0,
                            val,
                            deck = {},
                            $deck;

                        $(this).find('.deckdbbody, .deckdbbody2').each(function() {
                            if (labels[i]) {
                                $deck = $(this);
                                val = $deck.text().trim().replace(/\&nbsp;/g, '');

                                switch (labels[i]) {
                                    case 'Deck':
                                        // link取得
                                        deck['detaillink'] = $deck.find('a').attr('href');
                                        break;
                                    case 'Finish':
                                        val = 1 * val.replace(/^([0-9]+)[a-z]+$/, '$1');
                                        break;
                                }

                                deck[labels[i]] = val;
                            }
                            i++;
                        });

                        // デッキ情報以外が混ざりこむことを回避
                        if (!deck['Location']) {
                            return;
                        }

                        if (deck['Finish'] <= config.TOPDECKLIMIT) {
                            topdecks.push(deck);
                        }
                        decks.push(deck);
                    });

                    storage.set('decklists', {
                        date: storage.get('date'),
                        decks: topdecks
                    });

                    console.log('update: DeckLists');
                }
            ]
        });
    }
};
