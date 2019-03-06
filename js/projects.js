var CLOCK_ICON = 'https://benoit-atmire.github.io/projects_status/img/clock.svg';
var CLOCK_ICON_WHITE = 'https://benoit-atmire.github.io/projects_status/img/clock_white.svg';
var ATMIRE_ICON = 'https://benoit-atmire.github.io/projects_status/img/logo_white.svg';
var Promise = TrelloPowerUp.Promise;

/*TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        return t.cards('all')
            .then(function (cards) {
                console.log(JSON.stringify(cards, null, 2));
                for (c in cards){
                   t.get(cards[c].id, 'shared').then(function(card) {console.log(card)});
                }
            });
    }
});*/

TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        return [{
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


function createLabels(board, token, key) {

        var labels = {
            "Quote": {color:"green"},
            "Fixed Price Project": {color:"blue"},
            "Module installation": {color:"blue"},
            "Training": {color:"lime"},
            "Internal": {color:"lime"},
            "SLA": {color:"sky"},
            "Other": {color:"purple"},
            "Date changed": {color:"orange"},
            "Budget risk": {color:"red"},
            "Not found": {color:"black"}
        };

        for (var label in labels) {
            var request = new XMLHttpRequest();

            request.open("POST", "https://api.trello.com/1/boards/"+board+"/labels?name="+label+"&color="+labels[label].color+"&key="+key+"&token="+token, false);
            request.send();

            if (request.status != 200) return false;

            var l = JSON.parse(request.responseText);
            labels[label].id = l.id;
        }

        return labels;
}

var updateBoard = function (t) {


    // Get board data (settings & labels)

    return t.getAll()
        .then(function (data) {
            var settings;
            var labels;
            var mapping = {};
            if (data.board.private && data.board.private.settings) settings = data.board.private.settings;
            if (data.board && data.board.shared && data.board.shared.labels) labels = data.board.shared.labels;
            if (data.board && data.board.shared && data.board.shared.mapping) mapping = data.board.shared.mapping;
            console.log(data);
            return Promise.all([settings, labels || createLabels((t.getContext()).board, settings.ttoken, settings.tkey), mapping]);
        })
    // Then get cards, lists and projects
        .then(function (boarddata){
            console.log(boarddata);
            var settings = boarddata[0];
            var labels = boarddata[1];
            t.set('board', 'shared', 'labels', labels);
            return Promise.all([boarddata, t.lists('all'), getProjects(settings.pm, settings.username, settings.password)]);
        })
    // Then process all that info
        .then(function (values) {
            var settings = values[0][0];
            var labels = values[0][1];
            var cards = values[0][2];

            console.log("----------- Cards");
            console.log(JSON.stringify(cards, null, '\t'));
            console.log("-----------------");

            var lists_table = values[1];
            console.log(lists_table);
            var lists = {};
            for (var i in lists_table){lists[lists_table[i].name] = lists_table[i].id;}

            console.log("----------- Lists");
            console.log(JSON.stringify(lists, null, '\t'));
            console.log("-----------------");


            var projects = values[2];

            console.log("----------- Projects");
            console.log(JSON.stringify(projects, null, '\t'));
            console.log("-----------------");

            /* For each card:
            * - update existing project
            * - store latest project details in plugin data
            * - remove from projects list
            */
            for (var id in cards) {
                var p = projects[cards[id]] || null;
                delete projects[cards[id]];
                sendCard(t, id, p, settings, labels, lists, 0).then(function (updated) {
                    t.set(updated.trello, 'shared', 'project', projects[updated.project]);
                });

            }

            /* For remaining projects:
            * - create new project
            * - store project details in plugin data
            * - add project to mapping
            */

            for (var pid in projects){
                console.log("Processing project "+pid);
                sendCard(t, null, projects[pid], settings, labels, lists, 0).then(function (created) {
                    console.log("Created task: " + JSON.stringify(created));
                    cards[created.trello] = created.project;
                    t.set(created.trello, 'shared', 'project', projects[created.project]); //TODO: fix (card not available yet)
                });
            }


            return cards;

        }, function (error) { console.error(error);})
        .then (function (mapping) {
            console.log(JSON.stringify(mapping, null, '\t'));
            t.set('board', 'shared', 'mapping', JSON.stringify(mapping));
        });

}

function getProjects(pm, username, password){
    return new Promise(function (resolve, reject) {
        var xmlhttp = new XMLHttpRequest();
        var projects = {};
        xmlhttp.open("GET", "https://atmire.com/w2p-api/reports?username=" + username + "&password=" + password + "&report_type=projects_overview&department=Belgium");
        xmlhttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(xmlhttp.responseText);
                var p = response.projects;
                for (var i in p) {projects[p[i].project_id] = p[i]}
                resolve(projects);

            } else {
                console.log(xmlhttp.statusText);
                reject(Error(xmlhttp.statusText));
            }
        };
        xmlhttp.onerror = function () {
            console.log("network error");
            reject(Error("Something went wrong with the query (network error)"));
        }
        xmlhttp.send();
    });
}

function sendCard(t, card_id, project, settings, labels, lists, SLAcredits) {

    // Get old version of project, if any
    return ((card_id === null) ? false : t.get(card_id, 'shared', 'project')).then(function (old_project) {

        return new Promise( function (resolve, reject){

            var newcard = {
                token: settings.ttoken,
                key: settings.tkey
            };

            var comment = "";

            // Project status

            if (project === null) {
                newcard.idLabels += labels["Not found"].id;
            }

            else {
                // Initiate card values with basic project info
                newcard.name = project.project_name + " (" + project.company_name + ")";
                newcard.idList = lists[project.status] ? lists[project.status] : lists["Other"];
                newcard.desc = "";
                newcard.idLabels = "";

                // Add label for project type
                newcard.idLabels += labels[project.project_type] ? labels[project.project_type].id : labels["Other"].id;


                // Project dates
                var datechanged = false;

                newcard.desc += "Start date: " + project.start_date.substring(0, 10);
                if (old_project && project.start_date != old_project.start_date) {
                    comment += "Start date: " + project.start_date.substring(0, 10);
                    comment += " (was: " + old_project.start_date.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "End implementation date: " + project.end_impl.substring(0, 10);
                if (old_project && project.end_impl != old_project.end_impl) {
                    comment += "End implementation date: " + project.end_impl.substring(0, 10);
                    comment += " (was: " + old_project.end_impl.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "Start test date: " + project.start_test.substring(0, 10);
                if (old_project && project.start_test != old_project.start_test) {
                    newcard.desc += " (was: " + old_project.start_test.substring(0, 10) + ")";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "End date: " +project.end_date.substring(0, 10);
                if (old_project && project.end_date != old_project.end_date) {
                    comment += "End date: " + project.end_date.substring(0, 10);
                    comment += " (was: " + old_project.end_date.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "**********%0D%0A";

                if (datechanged) newcard.idLabels += "," + labels["Date changed"].id;

                // Project time & budget

                newcard.desc += "Billables: " + project.billable_hours + "%0D%0A";
                newcard.desc += "Worked: " + project.worked_hours;

                if (old_project) comment += (project.worked_hours - old_project.worked_hours) + " hour(s) worked since last log.";

                if (project.project_type == "Module installation" || project.project_type == "Fixed price project") {
                    var percentage = project.worked_hours / project.billable_hours;

                    if (project.status == "In Planning" && percentage > 0.1) newcard.idLabels += "," + labels["Budget risk"].id;
                    if (project.status == "In Progress" && percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;
                    if (project.status == "In Test" && percentage > 0.8) newcard.idLabels += "," + labels["Budget risk"].id;
                }

                else if (project.project_type == "Module installation") {
                    if (SLAcredits[project.project_id] > 0) newcard.idLabels += "," + labels["Budget risk"].id;
                }

            }

            var action;
            var url = "https://api.trello.com/1/cards";

            if (card_id === null) {
                action = 'POST';
                url += "?";
            }
            else {
                action = 'PUT';
                url += card_id + "?";
            }

            for (var c in newcard) {
                url += c + "=" + newcard[c] + "&";
            }

            url += "pos=top";

            var request = new XMLHttpRequest();

            request.open(action, url);

            request.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    var response = JSON.parse(request.responseText);
                    resolve({   "trello": response.id,
                                "project" : project.project_id
                            }
                            );
                } else {
                    console.log(xmlhttp.statusText);
                    reject(Error(xmlhttp.statusText));
                }
            };

            request.onerror = function () {
                console.log("network error");
                reject(Error("Something went wrong with the query (network error)"));
            }
            request.send();

            if (old_project) createComment(card_id, comment, settings.tkey, settings.ttoken);
        })
    })
}

function createComment(card_id, text, key, token) {

    var request = new XMLHttpRequest();

    request.addEventListener("readystatechange", function () {
        if (this.readyState === this.DONE) {
            console.log(this.responseText);
        }
    });

    request.open("POST", "https://trello.com/1/cards/" + card_id + "/actions/comments?text=" + text + "&key="+key+"&token="+token);

    request.send(null);
}

function getAllSLACreditsBalances() {
    return new Promise(function (resolve, reject) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "https://script.google.com/macros/s/AKfycbwAd7QSzVkRIxni-pv30PDjJYH-Zzp2X7PPuvJBSST3p3LmJs3B/exec");
        xmlhttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(JSON.parse(xmlhttp.responseText));

            } else {
                reject(Error(xmlhttp.statusText));
            }
        };
        xmlhttp.onerror = function () {
            reject(Error("Something went wrong with the query (network error)"));
        }
        xmlhttp.send();
    });
}
