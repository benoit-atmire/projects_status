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


function createLabels(board, token, key) {

        var labels = {
            "In Planning": {color:"sky"},
            "In Progress": {color:"blue"},
            "In Test": {color:"pink"},
            "Complete": {color:"lime"},
            "Archived": {color:"green"},
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

   return t.getAll()
        .then(function (values) {
            var settings = "";

            if (values.board.private && values.board.private.settings) settings = values.board.private.settings;

            console.log("Powerup custom data:");
            console.log(JSON.stringify(values));
            console.log("--------------------");

            var hasSettings = (settings != '' && settings.username && settings.password && settings.pm && settings.ttoken && settings.tkey);

            if (!hasSettings) {
                // TODO: redirect to settings OR display alert stating settings are missing
            }

            var board = t.getContext().board;
            var lists = getLists(board, settings.tkey, settings.ttoken);

            var today = new Date();
            var today_string = today.toISOString().substring(0,10);

            console.log("Lists:");
            console.log(JSON.stringify(lists));
            console.log("--------------------");

            var labels = {};
            if (values.board && values.board.shared && values.board.shared.labels) labels = values.board.shared.labels;
            else labels = createLabels(board, settings.ttoken, settings.tkey);


            console.log("Labels:");
            console.log(JSON.stringify(labels));
            console.log("--------------------");


            // Retrieve all projects for PM from W2P

            //var projects = getProjects("Nick");
            var projects = tmpprojects();
            var toSaveProjects = {};


            console.log("Projects:");
            console.log(JSON.stringify(projects));
            console.log("--------------------");


            var old_projects = {};

            if (values.board.shared && values.board.shared.projects) old_projects = values.board.shared.projects;


            console.log("Old projects");
            console.log(JSON.stringify(old_projects));
            console.log("--------------------");

            for (var pid in lists) {
                var newcard = {
                    name: "Meeting " + today_string,
                    idList: lists[pid],
                    desc: "",
                    idLabels: "",
                    token : settings.ttoken,
                    key : settings.tkey
                };

                // Project status

                if (!projects[pid]) {
                    newcard.idLabels += labels["Not found"].id;
                }

                else {
                    newcard.idLabels += labels[projects[pid].status] ? labels[projects[pid].status].id : labels["Other"].id;


                    // Project dates
                    var datechanged = false;

                    newcard.desc += "Start date: " + projects[pid].start_date;
                    if (old_projects[pid] && projects[pid].start_date == old_projects[pid].start_date){
                        newcard.desc += " (was: " + old_projects[pid].start_date + ")";
                        datechanged = true;
                    }
                    newcard.desc += "%0D%0A";

                    newcard.desc += "End implementation date: " + projects[pid].end_impl;
                    if (old_projects[pid] && projects[pid].end_impl == old_projects[pid].end_impl){
                        newcard.desc += " (was: " + old_projects[pid].end_impl + ")";
                        datechanged = true;
                    }
                    newcard.desc += "%0D%0A";

                    newcard.desc += "Start test date: " + projects[pid].start_test;
                    if (old_projects[pid] && projects[pid].start_test == old_projects[pid].start_test){
                        newcard.desc += " (was: " + old_projects[pid].start_test + ")";
                        datechanged = true;
                    }
                    newcard.desc += "%0D%0A";

                    newcard.desc += "End date: " + projects[pid].end_date;
                    if (old_projects[pid] && projects[pid].end_date == old_projects[pid].end_date){
                        newcard.desc += " (was: " + old_projects[pid].end_date + ")";
                        datechanged = true;
                    }
                    newcard.desc += "%0D%0A";

                    newcard.desc += "**********%0D%0A";

                    if (datechanged) newcard.idLabels += "," + labels["Date changed"].id;

                    // Project time & budget

                    newcard.desc += "Billables: " + projects[pid].billable_hours + "%0D%0A";
                    newcard.desc += "Worked: " + projects[pid].worked_hours;
                    if (old_projects[pid]) newcard.desc += "(+ " + (projects[pid].worked_hours - old_projects[pid].worked_hours) + ")";



                    var percentage = projects[pid].worked_hours / projects[pid].billable_hours;

                    // TODO: ellaborate based on following rules:
                    /*
                                --> if status == in planning, worked / billable must be < 10%
                                --> if status == ongoing, worked / billable must be < 60%
                                --> if status == testing, worked / billable must be < 85%
                    */
                    if (percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;

                    toSaveProjects[pid] = projects[pid];
                    
                    delete projects[pid];
                }

                createCard(newcard, settings.tkey, settings.ttoken);

            }

            for (var p in projects) {
                if (projects[p].project_type == "Fixed Price Project") {
                    var newlist = createList(projects[p].project_name + " ::" + projects[p].project_id, board, settings.tkey, settings.ttoken);

                    var newcard = {
                        name: "Meeting " + today_string,
                        idList: newlist,
                        desc: "",
                        idLabels: labels[projects[p].status] ? labels[projects[p].status].id : labels["Other"].id,
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


                    if (percentage > 0.6) newcard.idLabels += "," + labels["Budget risk"].id;

                    createCard(newcard, settings.tkey, settings.ttoken);

                }
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


function getProjects(pm){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://w2p-api/reports?username=rest&password=dspace&report_type=projects_overview&pm="+pm, false);
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

    for (var i in response){lists[response[i].name.split('::')[1]] = response[i].id;}

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

function createList(name, board, key, token) {
    var data = null;

    var request = new XMLHttpRequest();

    request.open("POST", "https://api.trello.com/1/boards/" + board + "/lists?name=" + name + "&key="+key+"&token="+token, false);

    request.send(data);

    if (request.status != 200) return "";

    var response = JSON.parse(request.responseText);

    return response.id;
}

function tmpprojects() {

    var p = [
                    {
                        "billable_hours": "0.00",
                        "company_name": "Curtin University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1478",
                        "project_name": "SLA (Curtin)",
                        "project_type": "SLA",
                        "start_date": "2017-04-04 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "3.35"
                    },
                    {
                        "billable_hours": "77.42",
                        "company_name": "European University Cyprus (EUC)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1498",
                        "project_name": "2017 DSpace Installation",
                        "project_type": "Fixed Price Project",
                        "start_date": "2017-05-10 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "In Progress",
                        "tl": "Philip",
                        "worked_hours": "41.85"
                    },
                    {
                        "billable_hours": "40.00",
                        "company_name": "Humboldt University of Berlin (HU Berlin)",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1500",
                        "project_name": "HU Berlin SLA",
                        "project_type": "SLA",
                        "start_date": "2017-05-11 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "76.81"
                    },
                    {
                        "billable_hours": "56.00",
                        "company_name": "European University Cyprus (EUC)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1508",
                        "project_name": "EUC Hosting",
                        "project_type": "Hosting",
                        "start_date": "2017-05-11 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "0.76"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Flinders University",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1545",
                        "project_name": "CUA4 Installation",
                        "project_type": "Module installation",
                        "start_date": "2017-11-09 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "In Progress",
                        "tl": "Philip",
                        "worked_hours": "1.25"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Makerere University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1547",
                        "project_name": "Makerere SLA",
                        "project_type": "SLA",
                        "start_date": "2017-11-15 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "1.50"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Instituut voor Tropische Geneeskunde Antwerpen (ITG)",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1552",
                        "project_name": "DSpace 6 quote",
                        "project_type": "Quote",
                        "start_date": "2017-11-20 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Quoting",
                        "tl": "Philip",
                        "worked_hours": "10.75"
                    },
                    {
                        "billable_hours": "24.00",
                        "company_name": "University of Nairobi",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1560",
                        "project_name": "CUA Update (5.5)",
                        "project_type": "Fixed Price Project",
                        "start_date": "2018-01-19 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "In Planning",
                        "tl": "Philip",
                        "worked_hours": "0.75"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "FHNW (Fachhochschule Nordwestschweiz)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1561",
                        "project_name": "DSpace 6 quote",
                        "project_type": "Quote",
                        "start_date": "2017-12-13 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Quoting",
                        "tl": "Kevin",
                        "worked_hours": "0.50"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Utrecht University",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1585",
                        "project_name": "OpenStack migration sales",
                        "project_type": "Quote",
                        "start_date": "2018-01-26 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Quoting",
                        "tl": "Tom",
                        "worked_hours": "5.25"
                    }
                ];
        var projects = {};

        for (var i in p) {projects[p[i].project_id] = p[i]}

        return projects;
}