const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
// set the view engine to ejs
app.set("view engine", "ejs");

//returns 6 random characters from characters and associates the new tinyURL to a longURL
const generateRandomString = () => {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tinyURL = "";
  for (let i = 0; i < 6; i++) {
    //use round to generate a number that can round up to between 0 and characters.length
    const randomNum = Math.floor(Math.random() * characters.length);
    tinyURL += characters[randomNum];
  }
  return tinyURL;
};

//database is not yet persistent when server restarts
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com",
  "S152tx": "https://www.tsn.ca/"
};

//test array for use on "/" route - will become surplus to requirements later on
const greetings = ["Hi", "Hello", "welcome", "Wilkommen"]


// Edge cases

// What would happen if a client requests a non-existent shortURL?
//timeout because the resource has been found but it cant re-direct to anything.

// What happens to the urlDatabase when the server is restarted?
// What type of status code do our redirects have? What does this status code mean?
// 302 Found - This response code means that the URI of requested resource has been changed temporarily. Further changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.

//Routes

//user management specific routes
//route that handles login button and sets cookie users name
app.post("/login", (req, res) => {
  //should set a cookie names username to value submitted in req body via login form
  res.cookie("username", req.body.username);
  res.redirect("/urls");
});

//route that handles logout button and resets cookie to "" when user logs out
app.post("/logout", (req, res) => {
  //should set a cookie names username to value submitted in req body via login form
  res.cookie("username", "");
  res.redirect("/urls");
});



//Test home route - currently using to experiment with objects as I learn
app.get("/", (req, res) => {
  res.send(`<h1>${greetings[3]}! Thank you for visiting the server</h1>`);
});

//added through duration of the work - shows tinyURLS and largeURLS in JSON format
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

//displays the current url database
app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase, 
    username: req.cookies["username"] 
  //any other vars
  };
  res.render("urls_index", templateVars);
});

//page that lets a user create a new shortened URL
app.get("/urls/new", (req, res) => {
  let templateVars = { username: req.cookies["username"]}
  res.render("urls_new", templateVars);
});

//handles a redirect from the u/shortURL to the full longURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[`${req.params.shortURL}`]
  res.redirect(longURL);
});

//displays information about the inputted shortURL e.g. urls/b2xVn2 will show the shortURL and long URL
app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[`${req.params.shortURL}`],  username: req.cookies["username"] };
  res.render("urls_show", templateVars);
});

//handles a deletion request using the delete button on urls/ route
app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[`${req.params.shortURL}`];
  res.redirect("/urls");
})

//updates an existing entries long URL redirects the user to /urls
app.post("/urls/:shortURL/update", (req, res) => {
  urlDatabase[req.params.shortURL] = req.body.longURL
  console.log(urlDatabase)
  res.redirect("/urls");
})

//generates new tinyURL with a random shortURL using the generateRandomString() function
app.post("/urls", (req, res) => {
  // console.log(req.body);  // Log the POST request body to the console
  let shortURL = generateRandomString(); //Log the randomly generated tinyURL to the console
  urlDatabase[shortURL] = req.body.longURL; //send the new shortURL and longURL to urlDatabase
  // console.log(urlDatabase); //log the urlDatabase to check the new values get added ok.
  res.redirect(`/urls/${shortURL}`); // redirection to /urls/:shortURL, where shortURL is the random string we generated.
});

//Test Hello Route - Delete later as extraneous code
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

//server listen - opens the server up to listen for requests from user
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

