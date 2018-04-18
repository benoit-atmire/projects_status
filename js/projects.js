var CLOCK_ICON = 'https://benoit-atmire.github.io/projects_status/img/clock.svg';
var CLOCK_ICON_WHITE = 'https://benoit-atmire.github.io/projects_status/img/clock_white.svg';

var Promise = TrelloPowerUp.Promise;

TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        console.log(JSON.stringify(t));
        console.log(JSON.stringify(opts));
        return [{
            // we can either provide a button that has a callback function
            icon: WHITE_ICON,
            text: 'Schedule meeting today',
            callback: tmpcallback(),
            condition: 'edit'
        }];
    },
    'show-settings': function(t, options){
        return t.popup({
            title: 'Settings',
            url: 'views/settings.html',
            height: 184,
            width: 600
      });
    }
});

function tmpcallback() {
    console.log("I've been clicked");
}

function updateBoard(t) {

   return Promise.all([t.lists('all'), t.getAll('list', 'shared', 'w2p', ''), t.get('board', 'shared', 'settings', '')])
        .then(function (values) {
            var lists = values[0];
            var today = new Date();
            var today_string = today.toISOString().substring(0,10);


            var creation = new Date(1000*parseInt(card.id.substring(0,8),16));
            var lastUpdate = new Date(card.dateLastActivity);
            var daysSinceCreation = Math.round(Math.abs((today.getTime() - creation.getTime())/(24*60*60*1000)));
            var daysSinceUpdate = Math.round(Math.abs((today.getTime() - lastUpdate.getTime())/(24*60*60*1000)));


            var settings = values[2];
            var hasSettings = (settings != '' && settings.username && settings.password && settings.pmid && settings.ttoken && settings.tkey);

            if (!hasSettings) {
                // TODO: redirect to settings OR display alert stating settings are missing
            }

            // Retrieve all projects for pmid from W2P

            var projects = "";



            // Presumably: foreach (i in lists)

                // Card creation structure

                var desc = "";

                // Required card info for the Trello API
                var card = {
                    'name' : "Meeting " + today_string,
                    'desc' : desc,
                    'idList' : list,
                    'pos' : 'top',
                    'token' : settings.ttoken,
                    'key' : settings.tkey
                };

                // Query to relevant endpoint
                var url = 'https://trello.com/1/cards';
                var options = {
                    'method' : 'post',
                    'payload' : card,
                    'muteHttpExceptions' : true
                };


                // Then delete project from object with "delete" operator (https://stackoverflow.com/questions/3455405/how-do-i-remove-a-key-from-a-javascript-object)

            // END FOREACH

            // Loop through remaining elements in "project"

                // If type == fixed price, create list with name == "Project name ::PID"

            if (values[1] && values[1].card && values[1].card.shared) {
                var w2plink = values[1].card.shared.w2plink || "";
                var gitlablink = values[1].card.shared.gitlablink || "";

                if (w2plink && w2plink != "") {
                    badges.push({
                        icon: W2P_ICON,
                        text: long ? 'W2P' : null,
                        url: w2plink,
                        title: 'Task / Project'
                    });
                }

                if (gitlablink && gitlablink != "") {
                    badges.push({
                        icon: GIT_ICON,
                        text: long ? 'Git' : null,
                        url: gitlablink,
                        title: 'Branch / Commit'
                    });
                }
            }
            return true;

        })
   ;
}