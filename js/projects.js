var CLOCK_ICON = 'https://benoit-atmire.github.io/projects_status/img/clock.svg';
var CLOCK_ICON_WHITE = 'https://benoit-atmire.github.io/projects_status/img/clock_white.svg';
var ATMIRE_ICON = 'https://benoit-atmire.github.io/projects_status/img/logo_white.svg';
var Promise = TrelloPowerUp.Promise;

TrelloPowerUp.initialize({
    'board-buttons': function (t, opts) {
        return t.cards('all')
            .then(function (cards) {
                console.log(JSON.stringify(cards, null, 2));
                for (c in cards){
                   t.get(cards[c].id, 'shared').then(function(card) {console.log(card)});
                }
            });
    }
});
/*
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
});*/


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

   return Promise.all([t.getAll(), t.getCards('all')])
        .then(function (values) {

            // Retrieve the scripts settings (W2P credentials, Trello API key and token,...)
            var settings = "";

            if (values[0].board.private && values[0].board.private.settings) settings = values[0].board.private.settings;

            console.log("Powerup custom data:");
            console.log(JSON.stringify(values));
            console.log("--------------------");

            var hasSettings = (settings != '' && settings.username && settings.password && settings.pm && settings.ttoken && settings.tkey);

            /*
            if (!hasSettings) {
                // TODO: redirect to settings OR display alert stating settings are missing
            }
*/
            var board = t.getContext().board;
            var lists = getLists(board, settings.tkey, settings.ttoken);
            var cards = values[1];

            console.log("Lists:");
            console.log(JSON.stringify(lists));
            console.log("--------------------");


            // Create or retrieve the state / alert labels
            var labels = {};
            if (values.board && values.board.shared && values.board.shared.labels) labels = values.board.shared.labels;
            else labels = createLabels(board, settings.ttoken, settings.tkey);


            console.log("Labels:");
            console.log(JSON.stringify(labels));
            console.log("--------------------");


            // Retrieve all projects for PM from W2P

            var projects = getProjects(settings.pm, settings.username, settings.password);
            //var projects = tmpprojects();
            var toSaveProjects = {};


            console.log("Projects:");
            console.log(JSON.stringify(projects));
            console.log("--------------------");


            var old_projects = {};

            if (values.board.shared && values.board.shared.projects) old_projects = values.board.shared.projects;


            console.log("Old projects");
            console.log(JSON.stringify(old_projects));
            console.log("--------------------");


            // Update all existing projects (== cards) with most recent information
            for (var c in cards) {
                t.get(cards[c].id, 'shared', 'project').then(function (project){
                    var pid = project.project_id;

                    var newcard = {
                        name: projects[pid].project_name + " (" + projects[pid].company_name + ")",
                        idList: lists[projects[pid].status] ? lists[projects[pid].status] : lists["Other"],
                        desc: "",
                        idLabels: "",
                        token : settings.ttoken,
                        key : settings.tkey
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

                        newcard.desc += "Start date: " + projects[pid].start_date.substring(0,10);
                        if (projects[pid].start_date != project.start_date){
                            comment += "Start date: " + projects[pid].start_date.substring(0,10);
                            comment += " (was: " + project.start_date.substring(0,10) + ")";
                            comment += "%0D%0A";
                            datechanged = true;
                        }
                        newcard.desc += "%0D%0A";

                        newcard.desc += "End implementation date: " + projects[pid].end_impl.substring(0,10);
                        if (projects[pid].end_impl != project.end_impl){
                            comment += "End implementation date: " + projects[pid].end_impl.substring(0,10);
                            comment += " (was: " + project.end_impl.substring(0,10) + ")";
                            comment += "%0D%0A";
                            datechanged = true;
                        }
                        newcard.desc += "%0D%0A";

                        newcard.desc += "Start test date: " + projects[pid].start_test.substring(0,10);
                        if (projects[pid].start_test != project.start_test){
                            newcard.desc += " (was: " + project.start_test.substring(0,10) + ")";
                            datechanged = true;
                        }
                        newcard.desc += "%0D%0A";

                        newcard.desc += "End date: " + projects[pid].end_date.substring(0,10);
                        if (projects[pid].end_date != project.end_date){
                            comment += "End date: " + projects[pid].end_date.substring(0,10);
                            comment += " (was: " + project.end_date.substring(0,10) + ")";
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




                        var percentage = projects[pid].worked_hours / projects[pid].billable_hours;

                        if (projects[pid].status == "In Planning" && percentage > 0.1) newcard.idLabels += "," + labels["Budget risk"].id;
                        if (projects[pid].status == "In Progress" && percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;
                        if (projects[pid].status == "In Test" && percentage > 0.8) newcard.idLabels += "," + labels["Budget risk"].id;

                        // Update the project data that will be stored, while still keeping the card ID in there
                        toSaveProjects[pid] = projects[pid];
                        toSaveProjects[pid].trello_card_id  = card_id;

                        // Remove that already-processed project from tne new projects' list so it's not processed twice
                        delete projects[pid];
                    }

                })
                var card_id = old_projects[pid].trello_card_id;
                var pid = cards[c].



                updateCard(card_id, newcard);
                createComment(card_id, comment, settings.tkey, settings.ttoken)

            }
            // Create new cards for all remaining projects
            for (var p in projects) {

                var newcard = {
                    name: projects[p].project_name + " (" + projects[p].company_name + ")",
                    idList: lists[projects[p].status] ? lists[projects[p].status] : lists["Other"],
                    desc: "",
                    idLabels: labels[projects[p].project_type] ? labels[projects[p].project_type].id : labels["Other"].id,
                    token : settings.ttoken,
                    key : settings.tkey
                };

                // Project dates

                newcard.desc += "Start date: " + projects[p].start_date;
                newcard.desc += "%0D%0A";

                newcard.desc += "End implementation date: " + projects[p].end_impl;
                newcard.desc += "%0D%0A";

                newcard.desc += "Start test date: " + projects[p].start_test;
                newcard.desc += "%0D%0A";

                newcard.desc += "End date: " + projects[p].end_date;
                newcard.desc += "%0D%0A";

                newcard.desc += "**********%0D%0A";

                // Project time & budget

                newcard.desc += "Billables: " + projects[p].billable_hours;
                newcard.desc += "Worked: " + projects[p].worked_hours;

                var percentage = projects[p].worked_hours / projects[p].billable_hours;

                if (projects[p].status == "In Planning" && percentage > 0.1) newcard.idLabels += "," + labels["Budget risk"].id;
                if (projects[p].status == "In Progress" && percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;
                if (projects[p].status == "In Test" && percentage > 0.8) newcard.idLabels += "," + labels["Budget risk"].id;

                toSaveProjects[p] = projects[p];
                toSaveProjects[p].trello_card_id = createCard(newcard, settings.tkey, settings.ttoken);


            }

            // store labels and old projects

            return Promise.all([t.set('board', 'shared', 'labels', labels), t.set('board', 'shared', 'projects', toSaveProjects)])
                .then(function(values){
                    console.log("Stored data:");
                    console.log(JSON.stringify(values));
                    console.log("--------------------");
                    return values;
                });
        })
   ;
}


function getProjects(pm, username, password){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://atmire.com/w2p-api/reports?username=" + username + "&password=" + password + "&report_type=projects_overview&pm="+pm, false);
    //xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send();

    var projects = {};


    if (xmlhttp.status != 200) return projects;

    var response = JSON.parse(xmlhttp.responseText);
    var p = response.projects;

    for (var i in p) {projects[p[i].project_id] = p[i]}

    return projects;
}

function getLists(board, key, token){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://api.trello.com/1/boards/"+board+"/lists/open?key="+key+"&token="+token, false);
    //xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send();

    var lists = {};

    if (xmlhttp.status != 200) return lists;

    var response = JSON.parse(xmlhttp.responseText);

    for (var i in response){lists[response[i].name] = response[i].id;}

    return lists;

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