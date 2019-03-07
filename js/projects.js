var ATMIRE_ICON = 'https://benoit-atmire.github.io/projects_status/img/logo_white.svg';
var Promise = TrelloPowerUp.Promise;


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
    },
    'card-badges': function(t, options) {
        return getAllBadges(t, false);
    },
    'card-detail-badges': function(t, options) {
        return getAllBadges(t, true);
    },
    'card-buttons': function(t, options){
        return getCardButtons(t);
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
            "Not found": {color:"black"},
            "TBD": {color:null}
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

            var lists = {};
            for (var i in lists_table){lists[lists_table[i].name] = lists_table[i].id;}

            /* For each card:
            * - update existing project
            * - store latest project details in plugin data
            * - remove from projects list
            */
            for (var id in old_projects) {
                // Get project data from W2P
                var new_project = projects[old_projects[id]] || null;

                // Delete project from W2P project list to prevent double processing
                delete projects[old_projects[id]];

                if (p !== null) {
                    t.get(old_projects[id].card_id, 'shared')
                        .then( function (card_data) {
                            return updateCard(t, old_projects[id].card_id, new_project, settings, labels, lists, card_data.project_id ? card_data : old_projects[id]);
                        });
                }

                else t.remove('board', 'shared', id);

            }


            /* For remaining projects:
            * - create new project
            * - store project details in plugin data
            * - add project to mapping
            */

            for (var pid in projects) {
                console.log("Processing project " + pid);

                new_projects[pid] = projects[pid];

               createCard(t, projects[pid], settings, labels, lists).then(function (created) {
                    console.log("Created card: " + JSON.stringify(created));
                });
            }


            return new_projects;

        });

}

function getProjects(pm, username, password){
    return new Promise(function (resolve, reject) {
        var xmlhttp = new XMLHttpRequest();
        var projects = {};
        xmlhttp.open("GET", "https://atmire.com/w2p-api/reports?username=" + username + "&password=" + password + "&report_type=projects_overview&pm="+pm);
        xmlhttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(xmlhttp.responseText);
                var p = response.projects;
                for (var i in p) {projects[p[i].project_id] = p[i]}
                resolve(projects);

            } /*else {
                console.log(xmlhttp.statusText);
                reject(new Error(xmlhttp.statusText));
            }*/
        };
        /*xmlhttp.onerror = function () {
            console.log("network error");
            reject(new Error("Something went wrong with the query (network error)"));
        }*/
        xmlhttp.send();
    });
}

function createCard(t, new_project, settings, labels, lists) {

    // Get old version of project, if any
    return new Promise( function (resolve, reject){

        var card = {
            token: settings.ttoken,
            key: settings.tkey,
            desc: "[W2P](https://web2project.atmire.com/web2project/index.php?m=projects%26a=view%26project_id=" + new_project.project_id + ") %0D%0A",
            name: new_project.project_name + " (" + new_project.company_name + ")",
            idList: lists[new_project.status] ? lists[new_project.status] : lists["Other"],
            idLabels: labels[new_project.project_type] ? labels[new_project.project_type].id : labels["Other"].id
        };

        // Add TL
        card.idLabels += "," + labels[new_project.tl] ? labels[new_project.tl].id : labels["TBD"].id

        var action = 'POST';
        var url = "https://api.trello.com/1/cards?";


        for (var c in card) {
            url += c + "=" + card[c] + "&";
        }

        url += "pos=top";

        var request = new XMLHttpRequest();

        request.open(action, url);

        request.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(request.responseText);
                var created = {new_project.project_id:new_project};
                created[new_project.project_id].card_id = response.id;
                t.set('board', 'shared', created);
                resolve(created);
            } /*else {
                console.log(request.statusText);
                reject(new Error(request.statusText));
            }*/
        };

        /*request.onerror = function () {
            console.log("network error");
            reject(new Error("Something went wrong with the query (network error)"));
        }*/
        request.send();
    });
}

function updateCard(t, card_id, new_project, settings, labels, lists, card_data) {

    // Get old version of project, if any
    return new Promise( function (resolve, reject){


        var comment = "";

        // Project status
        var idList = lists[new_project.status] ? lists[new_project.status] : lists["Other"];


        if (new_project.status != card_data.status) {
            comment += "Updated status: " + new_project.status;
            comment += " (was: " + card_data.status + ")";
            comment += "%0D%0A";
        }

        var idLabels = labels[new_project.project_type] ? labels[new_project.project_type].id : labels["Other"].id;


        // Project dates
        var datechanged = false;
        var datemissing = false;

        if (new_project.start_date == null || new_project.start_date.substring(0, 10) == "0000-00-00") datemissing = true;
        else {

            if (card_data && new_project.start_date != card_data.start_date) {
                comment += "Start date: " + new_project.start_date.substring(0, 10);
                comment += " (was: " + card_data.start_date.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }

        }

        if (new_project.end_impl == null || new_project.end_impl.substring(0, 10) == "0000-00-00") datemissing = true;
        else {

            if (card_data && new_project.end_impl != card_data.end_impl) {
                comment += "End implementation date: " + new_project.end_impl.substring(0, 10);
                comment += " (was: " + card_data.end_impl.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }

        }

        if (new_project.start_test == null || new_project.start_test.substring(0, 10) == "0000-00-00") datemissing = true;
        else {
            if (card_data && new_project.start_test != card_data.start_test) {
                comment += "Start test date: " + new_project.start_test.substring(0, 10);
                comment += " (was: " + card_data.start_test.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }
        }

        if (new_project.end_date == null || new_project.end_date.substring(0, 10) == "0000-00-00") datemissing = true;
        else {

            if (card_data && new_project.end_date != card_data.end_date) {
                comment += "End date: " + new_project.end_date.substring(0, 10);
                comment += " (was: " + card_data.end_date.substring(0, 10) + ")";
                comment += "%0D%0A";
                datechanged = true;
            }

        }

        if (datechanged) idLabels += "," + labels["Date changed"].id;
        if (datemissing) idLabels += "," + labels["Date missing"].id;

        if (!datemissing) {
            var nextDeadline;

            if (new_project.status == "In Planning" || new_project.status == "In Progress") nextDeadline = new Date(new_project.end_impl.substring(0, 10));
            else nextDeadline = new Date(new_project.end_date.substring(0, 10));

            if (nextDeadline < new Date()) idLabels += "," + labels["Outdated"].id;
        }
        // Project time & budget

        if (card_data && card_data.billable_hours != new_project.billable_hours) {
            comment += "Billable hours updated from " + card_data.billable_hours + " to " + new_project.billable_hours;
            comment += "%0D%0A";
            idLabels += "," + labels["Billable changed"].id;
        }


        if (card_data) comment += (new_project.worked_hours - card_data.worked_hours) + " hour(s) worked since last log.";

        if (new_project.project_type == "Module installation" || new_project.project_type == "Fixed price project") {
            var percentage = new_project.worked_hours / new_project.billable_hours;

            if (new_project.status == "In Planning" && percentage > 0.1) idLabels += "," + labels["Budget risk"].id;
            if (new_project.status == "In Progress" && percentage > 0.6) idLabels += "," + labels["Budget risk"].id;
            if (new_project.status == "In Test" && percentage > 0.8) idLabels += "," + labels["Budget risk"].id;
        }


        var action = 'PUT';
        var url = "https://api.trello.com/1/cards/" + card_id + "?idLabels="+idLabels+"&idList="+idList;

        // Save project data in card data
        t.set(card_id, 'shared', card_data);


        // Update card list and labels
        var request = new XMLHttpRequest();

        request.open(action, url);

        request.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(request.responseText);
                resolve({   "card_id": response.id,
                            "project" : new_project.project_id
                        }
                        );
            } /*else {
                console.log(request.statusText);
                reject(new Error(request.statusText));
            }*/
        };

        /*request.onerror = function () {
            console.log("network error");
            reject(new Error("Something went wrong with the query (network error)"));
        }*/
        request.send();

        // Comment card
        createComment(card_id, comment, settings.tkey, settings.ttoken);
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

            } /*else {
                reject(Error(xmlhttp.statusText));
            }*/
        };
        /*xmlhttp.onerror = function () {
            reject(Error("Something went wrong with the query (network error)"));
        }*/
        xmlhttp.send();
    });
}
