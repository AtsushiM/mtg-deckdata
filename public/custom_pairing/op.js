!function(){
    var query = C.util.parseQueryString(document.location.search);

    if (query.path && query.name && query.format) {
        query.name = query.name.replace(/(,|\+|\s)+/, ' ');
        new C.Ajax({
            url: 'http://mtg-deckdata.herokuapp.com/onlinepairing?path=' + query.path,
            dataType: 'json',
            oncomplete: function(data) {
                var matches = data.matches,
                    i,
                    match;

                for (i in matches) {
                    match = matches[i];
                    if (match.player.name === query.name) {
                        viewPairing(data.round, match);
                        return;
                    }
                }

                C.$('#view').html('Not Found Player.');
            }
        });
    } else {
        C.$('#view').hide();
        C.$('#form').show();
    }


    function viewPairing(round, match) {
        var $view = C.$('#view'),
            pairingBase = C.$('#pairing-base').html(),
            deckHistory = C.$('#deck-history').html(),
            history = new C.Ajax({
                url: 'https://mtg-deckdata.herokuapp.com/usedeckhistroy?username=' + match.opponent.name + '&format=' + query.format,
                dataType: 'json',
                oncomplete: function(data) {
                    console.log(data);
                    var store = '',
                        i,
                        opponent_deck_latest = '';

                    for (i in data.deckhistory) {
                        store += C.template(deckHistory, data.deckhistory[i]);

                        if (opponent_deck_latest === '') {
                            opponent_deck_latest = data.deckhistory[i].name;
                        }
                    }

                    $view.html(C.template(pairingBase, {
                        round: round,
                        table: match.table,
                        opponent_name: match.opponent.name,
                        opponent_point: match.opponent.point,
                        opponent_deck_latest: opponent_deck_latest,
                        player_name: match.player.name,
                        player_point: match.player.point,
                        deck_histroy: store
                    }));
                }
            });
    }
}();
