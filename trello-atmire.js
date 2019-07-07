const express = require('express');
var cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));

const port = 3001;

// your manifest must have appropriate CORS headers, you could also use 'https://trello.com'
app.use(cors({ origin: '*' }));

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("*", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
app.listen(port, () => {
    console.log(`App running on port ${port}.`)
  })


/* NOTE - Source for this is https://glitch.com/~trello-power-up-tutorial-part-three */