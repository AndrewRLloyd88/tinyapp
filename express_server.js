const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
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

//test array
const greetings = ["Hi", "Hello", "welcome", "Wilkommen"]

// Edge cases

// What would happen if a client requests a non-existent shortURL?
//timeout because the resource has been found but it cant re-direct to anything.

// What happens to the urlDatabase when the server is restarted?
// What type of status code do our redirects have? What does this status code mean?
// 302 Found - This response code means that the URI of requested resource has been changed temporarily. Further changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.

//Routes
app.get("/", (req, res) => {
  res.send(`<h1>${greetings[3]}! Thank you for visiting the server</h1>`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[`${req.params.shortURL}`]
  res.redirect(longURL);
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[`${req.params.shortURL}`] };
  res.render("urls_show", templateVars);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[`${req.params.shortURL}`];
  res.redirect("/urls");
})

app.post("/urls", (req, res) => {
  // console.log(req.body);  // Log the POST request body to the console
  let shortURL = generateRandomString(); //Log the randomly generated tinyURL to the console
  urlDatabase[shortURL] = req.body.longURL; //send the new shortURL and longURL to urlDatabase
  console.log(urlDatabase); //log the urlDatabase to check the new values get added ok.
  res.redirect(`/urls/${shortURL}`); // redirection to /urls/:shortURL, where shortURL is the random string we generated.
});


app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});