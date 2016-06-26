var UI = require('ui'),
    Vibe = require('ui/vibe'),
    ajax = require('ajax'),
    gmenu,
    is_request = false;

gmenu = new UI.Menu({
  sections: [{
    items: [
      { title: 'DecktypeCount' },
      { title: 'UsedCard' },
      { title: 'OnlinepairingList' },
      { title: 'Statistics' },
      { title: '+NewTournament' },
    ]
  }]
});

gmenu.show();

gmenu.on('select', function(e) {
  switch (e.item.title) {
      case 'DecktypeCount':
          actionDecktypeCount();
          break;
      case 'UsedCard':
          actionUsedCard();
          break;
      case 'OnlinepairingList':
          actionOnlinepairingList();
          break;
      case 'Statistics':
          actionStatistics();
          break;
      case '+NewTournament':
          Pebble.openURL('http://mtg-battle-log.herokuapp.com/tournaments/new');
          break;
  }

});

function actionDecktypeCount() {
    fetchData('decktypecount', function(data) {
        var menu = new UI.Menu({
            sections: [{
                items: createItem(data.decks)
            }]
        });

        menu.show();
    });

    function createItem(data) {
        var i,
            item,
            items = [];

        for (i in data) {
            item = data[i];
            items.push({
                title: item.name,
                subtitle: item.count + '/' + item.average_rank + ':' + item.highest_rank + '/' + item.encounter_rate
            });
        }

        return items;
    }
}

function actionUsedCard() {
    fetchData('usecards', function(data) {
        var main = new UI.Menu({
                sections: [{
                    items: createItem(data.main)
                }]
            }),
            side = new UI.Menu({
                sections: [{
                    items: createItem(data.side)
                }]
            }),
            menu = new UI.Menu({
                sections: [{
                    items: [
                        { title: 'Mainboard' },
                        { title: 'Sideboard' }
                    ]
                }]
            });

        menu.on('select', function (e) {
            switch (e.item.title) {
                case 'Mainboard':
                    main.show();
                    break;
                case 'Sideboard':
                    side.show();
                    break;
            }
        });

        menu.show();
    });

    function createItem(data) {
        var i,
            items = [],
            target,
            indeck;

        for (i in data) {
            target = data[i];
            indeck = target.indeck;

            items.push({
                title: target.name,
                subtitle: target.encounter_rate + ':' + target.adopotion_average + '/' +
                    indeck.use1 + '|' + indeck.use2 + '|' + indeck.use3 + '|' + indeck.use4 + '/' +
                    target.count
            });
        }

        return items;
    }
}

function actionOnlinepairingList() {
    fetchData('onlinepairingList', function(data) {
        var menu = new UI.Menu({
                sections: [{
                    items: createItem(data.pairing)
                }]
            });

        menu.on('select', function (e) {
            actionOnlinepairing(e.item.body, e.item.subtitle);
        });

        menu.show();
    });

    function createItem(data) {
        var i,
            items = [],
            target;

        for (i in data) {
            target = data[i];

            items.push({
                title: target.name,
                subtitle: target.format,
                body: target.url
            });
        }

        return items;
    }
}

function actionOnlinepairing(path, format) {
    var op = 'onlinepairing?path=' + path + '&format=' + format;

    fetchData(op, function(_data) {
        var data = _data,
            menu = new UI.Menu({
                sections: [{
                    items: createItem(data)
                }]
            }),
            detail = new UI.Menu(),
            _title,
            _latest_deckname;

        menu.show();

        menu.on('select', function (e) {
            _title = e.item.title;

            updateDetail();
        });

        detail.on('select', function(e) {
            switch (e.item.title) {
                case 'Reload':
                    fetchData(op, function(newdata) {
                        data = newdata;
                        updateDetail();
                    });
                    break;
                case '+NewRound':
                    Pebble.openURL('http://mtg-battle-log.herokuapp.com/tournaments/latest/rounds/new' +
                        '?no=' + data.round  +
                        '&opponent_name=' + findMatch(data, _title.split(':')[0]).opponent.name +
                        '&opponent_deck=' + _latest_deckname
                    );
                    break;
            }
        });

        function updateDetail() {
            var player = _title.split(':')[0],
                match = findMatch(data, player),
                items,
                i;

            fetchData('usedeckhistroy?username=' + match.opponent.name + '&format=' + format, function(dataUseDecks) {
                var deckhistory = dataUseDecks.deckhistory;

                items = [
                    { title: 'Reload' },
                    { title: 'Round:' + data.round },
                    { title: 'Table:' + match.table },
                    { title: player + ':' + match.player.point},
                    { title: 'vs'},
                    { title: match.opponent.name + ':' + match.opponent.point},
                    { title: '+NewRound' },
                    { title: 'Opponent-Use-Decks' }
                ];

                _latest_deckname = '';
                for (i in deckhistory) {
                    items.push({
                        title: deckhistory[i].name,
                        subtitle: deckhistory[i].date
                    });

                    if (_latest_deckname === '') {
                        _latest_deckname = deckhistory[i].name;
                    }
                }

                detail.hide();
                detail.sections([{
                    items: items
                }]);
                detail.show();
            });
        }
    });

    function findMatch(data, player) {
        var matches = data.matches,
            i,
            match,
            result = null;

        for (i in matches) {
            match = matches[i];
            if (match.player.name == player) {
                result = match;
                break;
            }
        }

        return result;
    }

    function createItem(data) {
        var round = data.round,
            matches = data.matches,
            i,
            item,
            items = [];

        items.push({
            title: 'Round ' + round
        });

        for (i in matches) {
            item = matches[i];
            items.push({
                title: item.player.name + ':' + item.player.point,
                subtitle: 'no' + item.table + '/' + item.opponent.name + ':' + item.opponent.point
            });
        }

        return items;
    }
}

function actionStatistics() {
    requestAPI('http://mtg-battle-log.herokuapp.com/statistics.json', function(data) {
        Pebble.openURL('http://mtg-battle-log.herokuapp.com/statistics');
        // var menu = new UI.Menu({
        //         sections: [{
        //             items: createItem(data)
        //         }]
        //     });
        //
        // menu.show();
        //
        // function createItem(data) {
        //     return [
        //         {
        //             title: 'Statistics'
        //         }
        //     ];
        // }
    }, function(error, status) {
        console.log(status);

        if (status === 401) {
            Pebble.openURL('http://mtg-battle-log.herokuapp.com/');
        }
    });
}

function fetchData(dataname, action, query) {
    return requestAPI('https://mtg-deckdata.herokuapp.com/' + dataname, action, null, query);
}

function requestAPI(uri, action, fail, query) {
    if (is_request === true) {
        return false;
    }

    if (!query) {
        query = {};
    }

    Vibe.vibrate('short');
    is_request = true;

    ajax(
        {
            url: uri,
            type: 'json',
            data: query
        },
        function(data, status, request) {
            is_request = false;
            action(data, status, request);
        },
        function(error, status, request) {
            is_request = false;
            console.log('The ajax request failed: ');
            for (var e in error) {
                console.log(e);
            }

            if (fail !== null) {
                fail(error, status, request);
            }
        }
    );

    return true;
}
