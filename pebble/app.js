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
      { title: 'HareruyaPairing' },
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
      case 'HareruyaPairing':
          actionHareruyaPairing();
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

function actionHareruyaPairing() {
    fetchData('harepairing', function(_data) {
        var data = _data,
            menu = new UI.Menu({
                sections: [{
                    items: createItem(data)
                }]
            }),
            detail = new UI.Menu(),
            _title;

        menu.show();

        menu.on('select', function (e) {
            _title = e.item.title;

            updateDetail();
        });

        detail.on('select', function(e) {
            switch (e.item.title) {
                case 'Reload':
                    fetchData('harepairing', function(newdata) {
                        data = newdata;
                        updateDetail();
                    });
                    break;
            }
        });

        function updateDetail() {
            var player = _title.split(':')[0],
                match = findMatch(data, player),
                items,
                i;

            fetchData('usedeckhistroy?username=' + match.opponent.name, function(dataUseDecks) {
                var deckhistory = dataUseDecks.deckhistory;

                items = [
                    { title: 'Reload' },
                    { title: 'Round:' + data.round },
                    { title: 'Table:' + match.table },
                    { title: player + ':' + match.player.point},
                    { title: 'vs'},
                    { title: match.opponent.name + ':' + match.opponent.point},
                    { title: 'Opponent-Use-Decks' }
                ];

                for (i in deckhistory) {
                    items.push({
                        title: deckhistory[i].name,
                        subtitle: deckhistory[i].date
                    });
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

function fetchData(dataname, action) {
    if (is_request === true) {
        return false;
    }

    Vibe.vibrate('short');
    is_request = true;

    ajax(
        {
            url: 'https://mtg-deckdata.herokuapp.com/' + dataname,
            type: 'json'
        },
        function(data, status, request) {
            is_request = false;
            action(data);
        },
        function(error, status, request) {
            is_request = false;
            console.log('The ajax request failed: ' + error);
        }
    );

    return true;
}
