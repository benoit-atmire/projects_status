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
            "Billable changed": {color:"orange"},
            "Budget risk": {color:"red"},
            "Timeline risk": {color:"red"},
            "Outdated": {color:"red"},
            "Date missing": {color:"red"},
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
            var projects = {};
            if (data.board.private && data.board.private.settings) settings = data.board.private.settings;
            if (data.board && data.board.private && data.board.private.labels) labels = data.board.private.labels;
            if (data.board && data.board.shared && data.board.shared.projects) projects = data.board.shared.projects;
            console.log(data);
            return Promise.all([settings, labels || createLabels((t.getContext()).board, settings.ttoken, settings.tkey), projects]);
        })
    // Then get cards, lists and projects
        .then(function (boarddata){
            console.log(boarddata);
            var settings = boarddata[0];
            var labels = boarddata[1];
            var projects = boarddata[2];
            t.set('board', 'private', 'labels', labels);
            return Promise.all([settings, labels, t.lists('all'), getProjects(settings.pm, settings.username, settings.password), projects]);
        })
    // Then process all that info
        .then(function (values) {
            var settings = values[0];
            var labels = values[1];
            var lists_table = values[2];
            var projects = values[3];
            var old_projects = values[4];
            var new_projects = {};

            console.log(values[3]);

            console.log("----------- Old projects");
            console.log(JSON.stringify(old_projects, null, '\t'));
            console.log("-----------------");


            console.log(lists_table);
            var lists = {};
            for (var i in lists_table){lists[lists_table[i].name] = lists_table[i].id;}

            console.log("----------- Lists");
            console.log(JSON.stringify(lists, null, '\t'));
            console.log("-----------------");


            console.log("----------- New projects");
            console.log(JSON.stringify(projects, null, '\t'));
            console.log("-----------------");

            /* For each card:
            * - update existing project
            * - store latest project details in plugin data
            * - remove from projects list
            */
            for (var id in old_projects) {
                // Get project data from W2P
                var p = projects[old_projects[id]] || null;

                // Delete project from W2P project list to prevent double processing
                delete projects[old_projects[id]];

                if (p !== null) {
                    // Store merged project in the new project variable
                    new_projects[id] = p;
                    new_projects[id].card_id = old_projects[id].card_id;
                }
                    // Update card
                updateCard(t, old_projects[id], p, settings, labels, lists);

                // If records are not deleted, add:
                //else t.remove('board', 'shared', id) && t.set(old_projects[id].card_id,'shared',old_projects[id]);
                // to delete the project at project level but still keep its data in the card just in case
            }


            /* For remaining projects:
            * - create new project
            * - store project details in plugin data
            * - add project to mapping
            */

            for (var pid in projects) {
                console.log("Processing project " + pid);

                new_projects[pid] = projects[pid];

                updateCard(t, null, projects[pid], settings, labels, lists).then(function (created) {
                    console.log("Created task: " + JSON.stringify(created));
                    new_projects[pid].card_id = created.card_id;
                });
            }


            return new_projects;

        })
        .then (function (new_projects) {
            console.log(JSON.stringify(mapping, null, '\t'));
            t.set('board', 'shared', JSON.stringify(new_projects));
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

function updateCard(t, old_project, new_project, settings, labels, lists) {

    // Get old version of project, if any
    return new Promise( function (resolve, reject){

        var card = {
            token: settings.ttoken,
            key: settings.tkey
        };

        var comment = "";

        // Project status

        if (new_project === null) {
            card.idLabels += labels["Not found"].id;
        }

        else {
            // Initiate card values with basic project info
            card.name = new_project.project_name + " (" + new_project.company_name + ")";
            card.idList = lists[new_project.status] ? lists[new_project.status] : lists["Other"];

            if (new_project.status != old_project.status) {
                comment += "Updated status: " + new_project.status;
                comment += " (was: " + old_project.status + ")";
                comment += "%0D%0A";
            }

            card.desc = "";
            card.idLabels = "";

            // Add label for project type
            card.idLabels += labels[new_project.project_type] ? labels[new_project.project_type].id : labels["Other"].id;


            // Project dates
            var datechanged = false;
            var datemissing = false;

            card.desc += "Start date: " + new_project.start_date.substring(0, 10);
            if (old_project && new_project.start_date != old_project.start_date) {
                comment += "Start date: " + new_project.start_date.substring(0, 10);
                comment += " (was: " + old_project.start_date.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }
            if (new_project.start_date.substring(0, 10) == "0000-00-00") datemissing = true;
            card.desc += "%0D%0A";

            card.desc += "End implementation date: " + new_project.end_impl.substring(0, 10);
            if (old_project && new_project.end_impl != old_project.end_impl) {
                comment += "End implementation date: " + new_project.end_impl.substring(0, 10);
                comment += " (was: " + old_project.end_impl.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }
            if (new_project.end_impl.substring(0, 10) == "0000-00-00") datemissing = true;
            card.desc += "%0D%0A";

            card.desc += "Start test date: " + new_project.start_test.substring(0, 10);
            if (old_project && new_project.start_test != old_project.start_test) {
                card.desc += " (was: " + old_project.start_test.substring(0, 10) + ")";
                datechanged = true;
            }
            if (new_project.start_test.substring(0, 10) == "0000-00-00") datemissing = true;
            card.desc += "%0D%0A";

            card.desc += "End date: " +new_project.end_date.substring(0, 10);
            if (old_project && new_project.end_date != old_project.end_date) {
                comment += "End date: " + new_project.end_date.substring(0, 10);
                comment += " (was: " + old_project.end_date.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }
            if (new_project.end_date.substring(0, 10) == "0000-00-00") datemissing = true;
            card.desc += "%0D%0A";

            card.desc += "**********%0D%0A";

            if (datechanged) card.idLabels += "," + labels["Date changed"].id;
            if (datemissing) card.idLabels += "," + labels["Date missing"].id;

            var nextDeadline;

            if (new_project.status == "In Planning" || new_project.status == "In Progress") nextDeadline = new Date(new_project.end_impl.substring(0, 10));
            else nextDeadline = new Date(new_project.end_date.substring(0, 10));

            if (nextDeadline < new Date()) card.idLabels += "," + labels["Outdated"].id;

            // Project time & budget

            card.desc += "Billables: " + new_project.billable_hours + "%0D%0A";

            if (old_project && old_project.billable_hours != new_project.billable_hours) {
                comment += "Billable hours updated from " + old_project.billable_hours + " to " + new_project.billable_hours;
                comment += "%0D%0A";
                card.idLabels += "," + labels["Billable changed"].id;
            }

            card.desc += "Worked: " + new_project.worked_hours;

            if (old_project) comment += (new_project.worked_hours - old_project.worked_hours) + " hour(s) worked since last log.";

            if (new_project.project_type == "Module installation" || new_project.project_type == "Fixed price project") {
                var percentage = new_project.worked_hours / new_project.billable_hours;

                if (new_project.status == "In Planning" && percentage > 0.1) card.idLabels += "," + labels["Budget risk"].id;
                if (new_project.status == "In Progress" && percentage > 0.6) card.idLabels += "," + labels["Budget risk"].id;
                if (new_project.status == "In Test" && percentage > 0.8) card.idLabels += "," + labels["Budget risk"].id;
            }


        }

        var action;
        var url = "https://api.trello.com/1/cards";

        if (old_project === null) {
            action = 'POST';
            url += "?";
        }
        else {
            action = 'PUT';
            url += old_project.card_id + "?";
        }

        for (var c in card) {
            url += c + "=" + card[c] + "&";
        }

        url += "pos=top";

        var request = new XMLHttpRequest();

        request.open(action, url);

        request.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(request.responseText);
                resolve({   "card_id": response.id,
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

        if (old_project !==null) createComment(old_project.card_id, comment, settings.tkey, settings.ttoken);
    });
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
