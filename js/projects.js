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
            console.log("Step 1 start");
            var settings;
            var labels;
            if (data.board.private && data.board.private.settings) settings = data.board.private.settings;
            if (data.board && data.board.shared && data.board.shared.labels) labels = data.board.shared.labels;
            console.log("Step 1 end");
            return Promise.all([settings, labels || createLabels((t.getContext()).board, settings.ttoken, settings.tkey)]);
        })
    // Then get cards, lists and projects
        .then(function (boarddata){
            console.log("Step 2 start");
            var settings = boarddata[0];
            var labels = boarddata[1];
            console.log(JSON.stringify(labels, null, '\t'));
            console.log("Step 2 end");
            return Promise.all([settings, t.cards('all'), t.lists('all)'), getProjects(settings.pm, settings.username, settings.password), labels])
        })
    // Then process all that info
        .then(function (values) {
            console.log("Step 3 start");
            var settings = values[0];
            var cards = values[1];
            var lists = values[2];
            //for (var i in lists_table){lists[lists_table[i].name] = lists_table[i].id;}
            var projects = values[3];
            var labels = values[4];


            console.log("Lists:");
            console.log(JSON.stringify(lists));
            console.log("--------------------");

            console.log("Labels:");
            console.log(JSON.stringify(labels));
            console.log("--------------------");

            console.log("Projects:");
            console.log(JSON.stringify(projects));
            console.log("--------------------");

            console.log("Cards:");
            console.log(JSON.stringify(cards));
            console.log("--------------------");

            /* For each card:
            * - update existing project
            * - store latest project details in plugin data
            * - remove from projects list
            */


            /* For remaining projects:
            * - create new project
            * - store project details in plugin data
            */
        })

}





function getProjects(pm, username, password){
    console.log("Start retrieving projects");
    return new Promise(function (resolve, reject) {
        var xmlhttp = new XMLHttpRequest();
        var projects = {};
        xmlhttp.open("GET", "https://atmire.com/w2p-api/reports?username=" + username + "&password=" + password + "&report_type=projects_overview&pm="+pm);
        xmlhttp.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var response = JSON.parse(xmlhttp.responseText);
                var p = response.projects;
                for (var i in p) {projects[p[i].project_id] = p[i]}
                console.log(JSON.stringify(projects, null, '\t'));
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

function createCard(card) {

    var request = new XMLHttpRequest();

    var url = "https://api.trello.com/1/cards?";

    for (var c in card) {
        url += c + "=" + card[c] + "&";
    }

    url += "pos=top";

    request.open("POST", url, false);
    request.send(null);

    if (request.status != 200) return "";

    var response = JSON.parse(request.responseText);

    return response.id;
}

function updateCard(card_id, newcard) {

    var request = new XMLHttpRequest();

    var url = "https://api.trello.com/1/cards?";

    for (var c in newcard) {
        url += c + "=" + newcard[c] + "&";
    }

    url += "pos=top";

    request.open("PUT", url);
    request.send(null);

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

function updateCards(cards, key, token) {

    var treated_projects = [];

    for (var c in cards) {
        Promise.all([t.get(cards[c].id, 'shared', 'project'), getAllSLACreditsBalances()]).then(function (values) {
            var project = values[0];
            var SLAcredits = values[1];
            var pid = project.project_id;

            var newcard = {
                name: projects[pid].project_name + " (" + projects[pid].company_name + ")",
                idList: lists[projects[pid].status] ? lists[projects[pid].status] : lists["Other"],
                desc: "",
                idLabels: "",
                token: settings.ttoken,
                key: settings.tkey
            };

            var comment = "";

            // Project status

            if (!projects[pid]) {
                newcard.idLabels += labels["Not found"].id;
            }

            else {
                // Add label for project type
                newcard.idLabels += labels[projects[pid].project_type] ? labels[projects[pid].project_type].id : labels["Other"].id;


                // Project dates
                var datechanged = false;

                newcard.desc += "Start date: " + projects[pid].start_date.substring(0, 10);
                if (projects[pid].start_date != project.start_date) {
                    comment += "Start date: " + projects[pid].start_date.substring(0, 10);
                    comment += " (was: " + project.start_date.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "End implementation date: " + projects[pid].end_impl.substring(0, 10);
                if (projects[pid].end_impl != project.end_impl) {
                    comment += "End implementation date: " + projects[pid].end_impl.substring(0, 10);
                    comment += " (was: " + project.end_impl.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "Start test date: " + projects[pid].start_test.substring(0, 10);
                if (projects[pid].start_test != project.start_test) {
                    newcard.desc += " (was: " + project.start_test.substring(0, 10) + ")";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "End date: " + projects[pid].end_date.substring(0, 10);
                if (projects[pid].end_date != project.end_date) {
                    comment += "End date: " + projects[pid].end_date.substring(0, 10);
                    comment += " (was: " + project.end_date.substring(0, 10) + ")";
                    comment += "%0D%0A";
                    datechanged = true;
                }
                newcard.desc += "%0D%0A";

                newcard.desc += "**********%0D%0A";

                if (datechanged) newcard.idLabels += "," + labels["Date changed"].id;

                // Project time & budget

                newcard.desc += "Billables: " + projects[pid].billable_hours + "%0D%0A";
                newcard.desc += "Worked: " + projects[pid].worked_hours;

                comment += (projects[pid].worked_hours - project.worked_hours) + " hour(s) worked since last log.";

                if (projects[pid].project_type == "Module installation" || projects[pid].project_type == "Fixed price project") {
                    var percentage = projects[pid].worked_hours / projects[pid].billable_hours;

                    if (projects[pid].status == "In Planning" && percentage > 0.1) newcard.idLabels += "," + labels["Budget risk"].id;
                    if (projects[pid].status == "In Progress" && percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;
                    if (projects[pid].status == "In Test" && percentage > 0.8) newcard.idLabels += "," + labels["Budget risk"].id;
                }

                else if (projects[pid].project_type == "Module installation") {
                    if (SLAcredits[pid] > 0) newcard.idLabels += "," + labels["Budget risk"].id;
                }


            }

            updateCard(cards[c].id, newcard);
            createComment(cards[c].id, comment, key, token);

            treated_projects.push(new Promise(function (resolve, reject) {
                if (true) resolve(pid);
                else reject(0);
            }));

        })

    }

    return treated_projects;
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
