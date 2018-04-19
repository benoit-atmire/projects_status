var CLOCK_ICON = 'https://benoit-atmire.github.io/projects_status/img/clock.svg';
var CLOCK_ICON_WHITE = 'https://benoit-atmire.github.io/projects_status/img/clock_white.svg';
var ATMIRE_ICON = 'https://benoit-atmire.github.io/projects_status/img/logo_white.svg';
var Promise = TrelloPowerUp.Promise;

TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        return [{
            // we can either provide a button that has a callback function
            icon: ATMIRE_ICON,
            text: 'Schedule meeting today',
            callback: function(t){
                return updateBoard(t);
            },
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

var updateBoard = function (t) {

   return t.getAll()
        .then(function (values) {
            var settings = "";

            //if (values.board.private ? values.board.private : '';

            console.log("Values:");
            console.log(JSON.stringify(values));
            console.log("--------------------");

            var board = t.getContext().board;
            var lists = getLists(board);

            console.log("Lists:");
            console.log(JSON.stringify(lists));
            console.log("--------------------");

            var today = new Date();
            var today_string = today.toISOString().substring(0,10);



            var hasSettings = (settings != '' && settings.username && settings.password && settings.pm && settings.ttoken && settings.tkey);

            if (!hasSettings) {
                // TODO: redirect to settings OR display alert stating settings are missing
            }

            // Retrieve all projects for PM from W2P

            var projects = getProjects("Nick");

            console.log("Projects:");
            console.log(JSON.stringify(projects));
            console.log("--------------------");

            for (var i in projects) {

            }

/*
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
*/
            return true;

        })
   ;
}


function getProjects(pm){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://w2p-api/reports?username=rest&password=dspace&report_type=projects_overview&pm="+pm, false);
    //xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send();

    var projects = {};


    if (xmlhttp.status != 200) return projects;

    var p = xmlhttp.responseText.projects;

    for (var i in p) {projects[p[i].project_id] = p[i]}

    return projects;
}

function getLists(board){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://api.trello.com/1/boards/"+board+"/lists/open", false);
    //xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send();

    var lists = {};

    if (xmlhttp.status != 200) return lists;

    var response = xmlhttp.responseText;

    console.log(response);

    for (var i in response){lists[response[i].name.split('::')[1]] = response[i].id;}

    return lists;

}


function createList(name, board) {
    var data = null;

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", function () {
      if (this.readyState === this.DONE) {
        console.log(this.responseText);
      }
    });

    xhr.open("POST", "https://api.trello.com/1/boards/" + board + "/lists?name=" + name);

    xhr.send(data);

    return "id"; // return list ID for chaining to card creation ; get it from responseText
}