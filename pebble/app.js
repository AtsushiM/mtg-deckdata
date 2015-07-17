var UI = require('ui'),
    ajax = require('ajax'),
    gmenu,
    is_request = false;

gmenu = new UI.Menu({
  sections: [{
    items: [
      { title: 'DecktypeCount' },
      { title: 'UsedCard' },
      // { title: 'DeckDetail' },
      { title: 'Tools' },
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
      // case 'DeckDetail':
      //     break;
      case 'Tools':
          actionTools();
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
                subtitle: item.count + '/' + item.highest_rank + '/' + item.encounter_rate
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

function actionTools() {
    var lifenum = 20,
        menu = new UI.Menu({
            sections: [{
                items: [
                    { title: 'Dice' },
                    { title: 'LifeCounter' },
                ]
            }]
        }),
        dice = new UI.Card({
            title: '1 - 1'
        }),
        life = new UI.Card({
            title: lifenum
        });

    dice.on('click', 'select', function (e) {
        dice.title('' + getDiceRand() + ' - ' + getDiceRand());
    });

    life.on('click', 'select', function (e) {
        lifenum = 20;
        life.title(lifenum);
    });
    life.on('click', 'up', function (e) {
        lifenum++;
        life.title(lifenum);
    });
    life.on('click', 'down', function (e) {
        lifenum--;
        life.title(lifenum);
    });

    menu.on('select', function (e) {
        switch (e.item.title) {
            case 'Dice':
                dice.show();
                break;
            case 'LifeCounter':
                life.show();
                break;
        }
    });
    menu.show();

    function getDiceRand() {
        return Math.floor(Math.random() * 6 + 1);
    }
}

function fetchData(dataname, action) {
    if (is_request === true) {
        return false;
    }

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
