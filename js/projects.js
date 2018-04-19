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

            if (values.board.private && values.board.private.settings) settings = values.board.private.settings;

            console.log("Settings:");
            console.log(JSON.stringify(settings));
            console.log("--------------------");

            var board = t.getContext().board;
            var lists = getLists(board, settings.tkey, settings.ttoken);

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

            //var projects = getProjects("Nick");
            var projects = tmpprojects();

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

function getLists(board, key, token){
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.open("GET", "https://api.trello.com/1/boards/"+board+"/lists/open?key="+key+"&token="+token, false);
    //xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send();

    var lists = {};

    if (xmlhttp.status != 200) return lists;

    var response = xmlhttp.responseText;

    console.log(response);

    for (var i in response){
        console.log(response[i]);
        console.log(response[i].name);
        lists[response[i].name.split('::')[1]] = response[i].id;
        }

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

function tmpprojects() {

    var p = [
                    {
                        "billable_hours": "419.67",
                        "company_name": "University College Cork - UCC - Boole Library",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "24",
                        "project_name": "SLA UCC",
                        "project_type": "SLA",
                        "start_date": "2010-04-01 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "547.89"
                    },
                    {
                        "billable_hours": "291.75",
                        "company_name": "Universidad Carlos III de Madrid",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "31",
                        "project_name": "SLA Carlos III",
                        "project_type": "SLA",
                        "start_date": "2010-01-01 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "349.73"
                    },
                    {
                        "billable_hours": "11.00",
                        "company_name": "Universiteit Leiden",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "168",
                        "project_name": "SLA Leiden",
                        "project_type": "SLA",
                        "start_date": "2010-12-13 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "37.25"
                    },
                    {
                        "billable_hours": "56.00",
                        "company_name": "Radboud Universiteit Nijmegen",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "222",
                        "project_name": "SLA Radboud",
                        "project_type": "SLA",
                        "start_date": "2011-02-22 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "102.64"
                    },
                    {
                        "billable_hours": "134.50",
                        "company_name": "University of Bradford",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "256",
                        "project_name": "SLA Bradford",
                        "project_type": "SLA",
                        "start_date": "2011-04-08 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "205.64"
                    },
                    {
                        "billable_hours": "222.75",
                        "company_name": "Nanyang Technological University (NTU)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "348",
                        "project_name": "SLA NTU",
                        "project_type": "SLA",
                        "start_date": "2011-08-19 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "223.46"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Karolinska Institutet University",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "411",
                        "project_name": "SLA karolinska",
                        "project_type": "SLA",
                        "start_date": "2011-12-15 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "14.03"
                    },
                    {
                        "billable_hours": "400.52",
                        "company_name": "University of Hertfordshire",
                        "department": "US",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "586",
                        "project_name": "SLA Hertfordshire",
                        "project_type": "SLA",
                        "start_date": "2012-07-17 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "194.35"
                    },
                    {
                        "billable_hours": "130.20",
                        "company_name": "University College Dublin (UCD)",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "621",
                        "project_name": "SLA (prepay) (UCD)",
                        "project_type": "SLA",
                        "start_date": "2012-08-27 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "72.36"
                    },
                    {
                        "billable_hours": "3.50",
                        "company_name": "University of Limerick",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "665",
                        "project_name": "SLA limerick",
                        "project_type": "SLA",
                        "start_date": "2012-10-25 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "44.48"
                    },
                    {
                        "billable_hours": "55.00",
                        "company_name": "University of Botswana",
                        "department": "US",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "764",
                        "project_name": "SLA botswana",
                        "project_type": "SLA",
                        "start_date": "2013-05-06 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "58.36"
                    },
                    {
                        "billable_hours": "95.50",
                        "company_name": "Utrecht University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "767",
                        "project_name": "SLA Utrecht",
                        "project_type": "SLA",
                        "start_date": "2013-05-08 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "134.57"
                    },
                    {
                        "billable_hours": "14.00",
                        "company_name": "CGIAR - ILRI",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "802",
                        "project_name": "SLA CGIAR",
                        "project_type": "SLA",
                        "start_date": "2013-07-16 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "54.23"
                    },
                    {
                        "billable_hours": "56.00",
                        "company_name": "University of Namibia - UNAM",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "874",
                        "project_name": "SLA  (UNAM)",
                        "project_type": "SLA",
                        "start_date": "2013-11-04 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "30.95"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "UniversitÃ¤t TÃ¼bingen",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "890",
                        "project_name": "SLA Tubingen",
                        "project_type": "SLA",
                        "start_date": "2013-11-29 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": null,
                        "worked_hours": "8.00"
                    },
                    {
                        "billable_hours": "37.00",
                        "company_name": "NLBIF / Darwin Media",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "905",
                        "project_name": "SLA NLBIF",
                        "project_type": "SLA",
                        "start_date": "2014-01-09 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "22.49"
                    },
                    {
                        "billable_hours": "9.00",
                        "company_name": "Dublin Business School",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "938",
                        "project_name": "SLA DBS",
                        "project_type": "SLA",
                        "start_date": "2014-03-13 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "9.10"
                    },
                    {
                        "billable_hours": "98.00",
                        "company_name": "Vrije Universiteit Amsterdam (VU)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "989",
                        "project_name": "SLA VU",
                        "project_type": "SLA",
                        "start_date": "2014-06-26 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": null,
                        "worked_hours": "99.64"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "University of Cape Town",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1032",
                        "project_name": "SLA UCT",
                        "project_type": "SLA",
                        "start_date": "2014-08-29 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": null,
                        "worked_hours": "10.76"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Institute of Development Studies (IDS)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1056",
                        "project_name": "SLA (prepay) (IDS)",
                        "project_type": "SLA",
                        "start_date": "2014-09-22 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "19.36"
                    },
                    {
                        "billable_hours": "16.00",
                        "company_name": "LACEA",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1085",
                        "project_name": "SLA LACEA",
                        "project_type": "SLA",
                        "start_date": "2014-10-28 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "22.76"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Vrije Universiteit Amsterdam (VU)",
                        "department": "Belgium",
                        "end_date": "2015-03-27 23:59:59",
                        "end_impl": "2015-03-13 00:00:00",
                        "pm": "Nick",
                        "project_id": "1171",
                        "project_name": "VU- Metis intergratie",
                        "project_type": "Fixed Price Project",
                        "start_date": "2015-01-05 00:00:00",
                        "start_test": "2015-03-13 00:00:00",
                        "status": "In Progress",
                        "tl": null,
                        "worked_hours": "33.00"
                    },
                    {
                        "billable_hours": "207.00",
                        "company_name": "FHNW (Fachhochschule Nordwestschweiz)",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1213",
                        "project_name": "SLA (FNHW)",
                        "project_type": "SLA",
                        "start_date": "2015-06-01 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "306.31"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Instituut voor Tropische Geneeskunde Antwerpen (ITG)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1240",
                        "project_name": "SLA ITG",
                        "project_type": "SLA",
                        "start_date": "2015-07-22 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "15.80"
                    },
                    {
                        "billable_hours": "21.50",
                        "company_name": "Netherlands Cancer Institute (NKI) (NCI)",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1246",
                        "project_name": "SLA NKI",
                        "project_type": "SLA",
                        "start_date": "2015-08-13 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "46.11"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "NUI Galway",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1265",
                        "project_name": "SLA - NUI",
                        "project_type": "SLA",
                        "start_date": "2015-09-30 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "88.14"
                    },
                    {
                        "billable_hours": "64.25",
                        "company_name": "Plymouth University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1277",
                        "project_name": "SLA Plymouth",
                        "project_type": "SLA",
                        "start_date": "2015-10-22 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "125.48"
                    },
                    {
                        "billable_hours": "56.00",
                        "company_name": "Cardiff Metropolitan University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1340",
                        "project_name": "Cardiff Managed Hosting - Expires May 26",
                        "project_type": "Hosting",
                        "start_date": "2016-05-26 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "5.60"
                    },
                    {
                        "billable_hours": "5.50",
                        "company_name": "The Institute of Cancer Research UK (ICR)",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1345",
                        "project_name": "SLA ICR",
                        "project_type": "SLA",
                        "start_date": "2016-04-21 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "42.42"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Cranfield University",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1363",
                        "project_name": "SLA Cranfield",
                        "project_type": "SLA",
                        "start_date": "2016-06-24 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "10.09"
                    },
                    {
                        "billable_hours": "50.00",
                        "company_name": "LACEA",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1371",
                        "project_name": "Lacea Hosting",
                        "project_type": "Hosting",
                        "start_date": "2016-04-01 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Kevin",
                        "worked_hours": "9.25"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Imperial College London",
                        "department": "Belgium",
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1378",
                        "project_name": "SLA Imperial",
                        "project_type": "SLA",
                        "start_date": "2016-08-03 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Tom",
                        "worked_hours": "27.72"
                    },
                    {
                        "billable_hours": "0.00",
                        "company_name": "Cardiff Metropolitan University",
                        "department": null,
                        "end_date": "0000-00-00 00:00:00",
                        "end_impl": "0000-00-00 00:00:00",
                        "pm": "Nick",
                        "project_id": "1381",
                        "project_name": "SLA Cardiff",
                        "project_type": "SLA",
                        "start_date": "2016-08-04 00:00:00",
                        "start_test": "0000-00-00 00:00:00",
                        "status": "Continuous",
                        "tl": "Philip",
                        "worked_hours": "16.36"
                    },
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