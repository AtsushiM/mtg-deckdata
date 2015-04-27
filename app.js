var http = require('http'),
    client = require('cheerio-httpcli'),
    hit_chart = [],
    decklists = [],
    deckdetails = [],
    usecards = [],
    decktypecount = {};

updatePairingHareruya();
updateHitChartHareruya();
updateDecklistSCG();

// setInterval(updatePairingHareruya, 1 * 60 * 60 * 1000);
// setInterval(updateHitChartHareruya, 1 * 60 * 60 * 1000);

http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    for (deck in decklists) {
        res.write(JSON.stringify(decklists[deck]));
    }

    res.end();
}).listen(3000);

function makeStringDate(date) {
    return [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate()
    ].join('-');
}

function updatePairingHareruya() {
    client.fetch('http://www.happymtg.com/pairing/legacy/PL.html', {}, function (err, $, res) {
      // 記事のタイトルを取得
      var body = $('body').text();

      if (body.match(/準備中/)) {
        console.log("データなし");
      }
      else {
        console.log(body);
      }
    });
}

function updateHitChartHareruya() {
    client.fetch('http://www.hareruyamtg.com/jp/default.aspx', {}, function (err, $, res) {
      // 記事のタイトルを取得
      $('#hit_legacy .weekg').each(function() {
          var $this = $(this),
              deckname = $this.find('.deck_title_top a').text().trim(),
              deckcount = 1 * $this.find('.formatcount').text().trim();

          deckname = deckname.split('/')[1];
          hit_chart[deckname] = deckcount;
      });

      console.log('update: HitChart');
    });
}

function updateDecklistSCG() {
    var now = new Date();
        before_1month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end_date = makeStringDate(now),
        start_date = makeStringDate(before_1month);

    client.fetch('http://sales.starcitygames.com/deckdatabase/deckshow.php?&t[C1]=3&start_date=' + start_date + '&end_date=' + end_date + '&start_num=0&limit=100', {}, function (err, $, res) {
        var $lists = $('#content table'),
            labels = [],
            decks = [],
            alldecks = [],
            deckid = 0;

        $lists.find('.deckdbheader').each(function () {
            labels.push($(this).text());
        });

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

            if (val <= 3) {
                decks.push(deck);
            }
            alldecks.push(deck);
        });

        decklists = decks;
        console.log('update: DeckLists');

        deckdetails = [];
        usecards = [];
        decktypecount = {};
        updateDeckTypeCountSCG(alldecks);
        // updateDeckDetailRecursiveSCG(decklists.slice());
    });
}
function updateDeckTypeCountSCG(alldecks) {
    var name,
        decks = [];

    // 集計
    for (deck in alldecks) {
        name = alldecks[deck]['Deck'];
        if (!decks[name]) {
            decks[name] = 0;
        }

        decks[name]++;
    }

    alldecks = [];
    // sortのため配列形式の変更
    for (deck in decks) {
        alldecks.push({
            'name': deck,
            'count': decks[deck]
        });
    }

    alldecks.sort(function(a, b) {
        if (a['count'] < b['count']) {
            return 1;
        }
        if (a['count'] > b['count']) {
            return -1;
        }
        return 0;
    });

    // 配列形式を元のシンプルな形式に修正
    for (deck in alldecks) {
        decktypecount[alldecks[deck]['name']] = alldecks[deck]['count'];
    }

    console.log('update: DeckTypeCount');
    console.log(decktypecount);
}
function updateDeckDetailRecursiveSCG(decks) {
    var deck = decks.shift(),
        count = 0,
        main = [],
        side = [];

    if (deck) {
        client.fetch(deck['detaillink'], {}, function (err, $, res) {
            $('.deck_listing2').find('li').each(function() {
                var line = $(this).text().trim().match(/^([0-9]+)\s(.+)$/),
                    name = line[2],
                    num = 1 * line[1];

                // デッキで使用されてるカード毎に枚数を集計
                if (!usecards[name]) {
                    usecards[name] = 0
                }
                usecards[name] += num;

                // デッキリスト
                count += 1 * num;
                // trueならサイドボード
                if (!main[name] && count <= 60) {
                    main[name] = num;
                }
                else {
                    side[name] = num;
                }
            });

            deckdetails.push({
                'main': main,
                'side': side
            });

            updateDeckDetailRecursiveSCG(decks);
        });
    }
    else {
        console.log('update: DeckDetail');
    }
}

