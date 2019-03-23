var ATMIRE_ICON = 'https://benoit-atmire.github.io/projects_status/img/logo_white.svg';
var Promise = TrelloPowerUp.Promise;


TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        return [{
            icon: ATMIRE_ICON,
            text: 'Schedule meeting today',
            callback: function(t){
                return updateBoard(t, false);
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
    /*'card-badges': function(t, options) {
        updateLabels(t);
        return getAllBadges(t, false);
    },
    'card-detail-badges': function(t, options) {
        return getAllBadges(t, true);
    },*/
    'card-buttons': function(t, options){
        return getCardButtons(t);
    }
});




function updateLabels(t){
    // TODO

    // For current card

    // Get addon data

    // Get fields "warnings" and "messages"

    // For each of these values, add corresponding label

    // Send POST request to card to add labels

    // Delete "messages" field from plugin data
}



function updateBoard (t, filter) {

    // TODO: refactor / rewrite:

    /*
    For each card in the board,
    - get updated W2P data
    - compare with current data
    - calculate the "warning" and "messages" fields
    - add comments with the changes

     */


    // Get board data (settings & labels)

    return t.getAll()
        .then(function (data) {
            console.log(data);
            var settings;
            var labels;
            if (data.board.private && data.board.private.settings) settings = data.board.private.settings;
            if (data.board && data.board.shared && data.board.shared.labels) labels = data.board.shared.labels;
            return Promise.all([settings, labels, t.lists('all'), getProjects(settings.username, settings.password), t.cards('all')]);
        })
    // Then process all that info
        .then(function (values) {
            var settings = values[0];
            var labels = values[1];
            var lists_table = values[2];
            var projects = values[3];
            var cards = values[4];

            console.log(values);

            var lists = {};
            for (var i in lists_table){lists[lists_table[i].name] = lists_table[i].id;}

            if (filter){
                t.get(cards[filter].id, 'private')
                    .then(function (cardinfo){
                        updateCard(t, cardinfo.id, projects[cardinfo.pid], settings, labels, lists);
                    })
            }

            else {
                for (var c = 0; c < cards.length; c++) {
                    t.get(cards[c].id, 'private')
                        .then(function (cardinfo) {
                            if (cardinfo.id) updateCard(t, cardinfo.id, projects[cardinfo.pid], settings, labels, lists);
                        })
                }
            }
        });

}

function getProjects(username, password){
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

function updateCard(t, card_id, new_project, settings, labels, lists) {
    console.log(card_id);
    return t.get(card_id, 'shared') // Get old version of project, if any
        .then(function (card_data){
            console.log(card_data);
            return Promise.all([t.set(card_id, 'shared', card_data), new Promise( function (resolve, reject){

                var card = {
                    token: settings.ttoken,
                    key: settings.tkey,
                    desc: "[W2P](https://web2project.atmire.com/web2project/index.php?m=projects%26a=view%26project_id=" + new_project.project_id + ") %0D%0A",
                    name: new_project.project_name + " (" + new_project.company_name + ")",
                    idList: lists[new_project.status] ? lists[new_project.status] : lists["Other"]
                };

                var idLabels_add = [];
                idLabels_add.push(labels[new_project.project_type] ? labels[new_project.project_type].id : labels["Other"].id);
                var idLabels_remove = [];

                var comment = "";

                if (card_data.status && new_project.status != card_data.status) {
                    comment += "Updated status: " + new_project.status;
                    comment += " (was: " + card_data.status + ")";
                    comment += "%0D%0A";
                }


                // Project dates
                var datechanged = false;
                var datemissing = false;

                if (new_project.start_date == null || new_project.start_date.substring(0, 10) == "0000-00-00") datemissing = true;
                else {

                    if (card_data.start_date && new_project.start_date != card_data.start_date) {
                        comment += "Start date: " + new_project.start_date.substring(0, 10);
                        comment += " (was: " + card_data.start_date.substring(0, 10) + ")";
                        comment += "%0D%0A";
                        datechanged = true;
                    }

                }

                if (new_project.end_impl == null || new_project.end_impl.substring(0, 10) == "0000-00-00") datemissing = true;
                else {

                    if (card_data.end_impl && new_project.end_impl != card_data.end_impl) {
                        comment += "End implementation date: " + new_project.end_impl.substring(0, 10);
                        comment += " (was: " + card_data.end_impl.substring(0, 10) + ")";
                        comment += "%0D%0A";
                        datechanged = true;
                    }

                }

                if (new_project.start_test == null || new_project.start_test.substring(0, 10) == "0000-00-00") datemissing = true;
                else {
                    if (card_data.start_test && new_project.start_test != card_data.start_test) {
                        comment += "Start test date: " + new_project.start_test.substring(0, 10);
                        comment += " (was: " + card_data.start_test.substring(0, 10) + ")";
                        comment += "%0D%0A";
                        datechanged = true;
                    }
                }

                if (new_project.end_date == null || new_project.end_date.substring(0, 10) == "0000-00-00") datemissing = true;
                else {

                    if (card_data.end_date && new_project.end_date != card_data.end_date) {
                        comment += "End date: " + new_project.end_date.substring(0, 10);
                        comment += " (was: " + card_data.end_date.substring(0, 10) + ")";
                        comment += "%0D%0A";
                        datechanged = true;
                    }

                }

                if (datechanged) idLabels_add.push(labels["Date changed"].id);
                if (datemissing) idLabels_add.push(labels["Date missing"].id);
                else idLabels_remove.push(labels["Date missing"].id);

                if (!datemissing) {
                    var nextDeadline;

                    if (new_project.status == "In Planning" || new_project.status == "In Progress") nextDeadline = new Date(new_project.end_impl.substring(0, 10));
                    else nextDeadline = new Date(new_project.end_date.substring(0, 10));

                    if (nextDeadline < new Date()) idLabels_add.push(labels["Outdated"].id);
                    else idLabels_remove.push(labels["Outdated"].id);
                }
                // Project time & budget

                if (card_data.billable_hours && card_data.billable_hours != new_project.billable_hours) {
                    comment += "Billable hours updated from " + card_data.billable_hours + " to " + new_project.billable_hours;
                    comment += "%0D%0A";
                    idLabels_add.push(labels["Billable changed"].id);
                }



                if (card_data.worked_hours) comment += (new_project.worked_hours - card_data.worked_hours) + " hour(s) worked since last log.";

                if (new_project.project_type == "Module installation" || new_project.project_type == "Fixed price project") {
                    var percentage = new_project.worked_hours / new_project.billable_hours;
                    var budgetrisk = false;

                    if (new_project.status == "In Planning" && percentage > 0.1) budgetrisk = true;
                    if (new_project.status == "In Progress" && percentage > 0.6) budgetrisk = true;
                    if (new_project.status == "In Test" && percentage > 0.8) budgetrisk = true;

                    if (budgetrisk) idLabels_add.push(labels["Budget risk"].id);
                    else  idLabels_remove.push(labels["Budget risk"].id);
                }


                var action = 'PUT';
                var url = "https://api.trello.com/1/cards/" + card_id + "?";

                for (var c in card) {
                    url += c + "=" + card[c] + "&";
                }

                url += "pos=top";

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
                if (comment.length > 0) createComment(card_id, comment, settings.tkey, settings.ttoken);
                if (idLabels_add.length > 0) addLabels(idLabels_add, card_id, settings.tkey, settings.ttoken);
                if (idLabels_remove.length > 0) removeLabels(idLabels_remove, card_id, settings.tkey, settings.ttoken);

            })];
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

function addLabels(labels, card_id, key, token){

    for (var l in labels) {
        console.log("Adding label " + labels[l]);
        var xhr = new XMLHttpRequest();

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === this.DONE) {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "https://api.trello.com/1/cards/" + card_id + "/idLabels?value=" + labels[l] + "&key=" + key + "&token=" + token);

        xhr.send(null);
    }
}

function removeLabels(labels, card_id, key, token){
    for (var l in labels){
        console.log("Removing label " + labels[l]);
        var xhr = new XMLHttpRequest();

        xhr.addEventListener("readystatechange", function () {
            if (this.readyState === this.DONE) {
                console.log(this.responseText);
            }
        });

        xhr.open("DELETE", "https://api.trello.com/1/cards/"+card_id+"/idLabels/"+labels[l]+"?key="+key+"&token="+token);

        xhr.send(null);
    }

}

function getAllBadges(t, long) {
    // TODO: badge with end date for current phase

    // TODO/ badge with activity level (based on time worked last week) ?

    // TODO: badge for ?

    return {};

}

function getCardButtons(t) {
    return t.getAll()
        .then(function (data) {
            console.log(data);
            var buttons = [];
            if (data && (!data.card || !data.card.private || !data.card.private.pid || data.card.private.pid == "")){
                buttons.push({
                    icon: ATMIRE_ICON,
                    text: "Map with project",
                    callback: function (t) {
                        return t.popup({
                            title: "W2P Project",
                            url: 'views/mapproject.html'
                        })

                    }
                });
            }

            else {
                buttons.push({
                    icon: ATMIRE_ICON,
                    text: "Update project info",
                    callback: function(t){
                        return updateBoard(t,t.getContext().card);
                    }
                });

                if (data.card.shared && data.card.shared.project_type && data.card.shared.project_type == "SLA"){
                    buttons.push({
                        icon: ATMIRE_ICON,
                        text: "Add fixed price credits",
                        /*callback: function(t){
                            return t.popup({
                                title: "W2P Link",
                                url: 'views/settings.html'
                            });*/
                        url: "https://www.atmire.com"
                    });
                }
            }

            return buttons;

        });
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
