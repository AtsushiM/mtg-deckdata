!function(){
    var ajax = new C.Ajax({
        url: 'http://mtg-deckdata.herokuapp.com/onlinepairingList',
        dataType: 'json',
        oncomplete: function(data) {
            console.log(data);
        }
    });
}();
