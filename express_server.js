const express = require("express");
const app = express();
const morgan = require('morgan');
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const helpers = require('./helpers');
const urlDatabase = require('./urlDatabase');
const userDatabase = require('./userDatabase')
//generate 10 salt rounds
const salt = bcrypt.genSaltSync(10);
const cookieSession = require('cookie-session');

//settings for bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

//settings for CookieSession
app.use(cookieSession({
  name: 'session',
  keys: ["10987654321ABC123"],
  maxAge: 24 * 60 * 60 * 1000 //24 hours
}));

// set the view engine to ejs
app.set("view engine", "ejs");

// morgan middleware allows to log the request in the terminal
app.use(morgan('short'));

//keeps track of URLS belonging to the specific user logged in, populated by checking userID against userDB shortURL ids.
let userURLS = {};

//test array for use on "/" route - will become surplus to requirements later on
const greetings = ["Hi", "Hello", "welcome", "Wilkommen"];



// Edge cases
//What would happen if a client requests a non-existent shortURL?
//attempt to fix in


///////////////////////////////////////////
//user account management specific routes
//-----------------------------------------
///////////////////////////////////////////

//displays login page
app.get("/login", (req, res) => {
  let templateVars = {
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };
  res.render('login', templateVars);
});

//handles login requests
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  //are our login fields populated?
  if (!helpers.checkFieldsPopulated(email, password)) {
    res.sendStatus(400);
  }
  //check if we can find a matching user
  const foundUser = helpers.getUserByEmail(email, urlDatabase);
  if (foundUser === null || foundUser === undefined) {
    res.sendStatus(403);
  }
  //does the password match?
  if (!helpers.passwordCheck(password, foundUser)) {
    res.sendStatus(403);
  } else {
    req.session.id = userDatabase[foundUser].id;
    userURLS = helpers.getUrlsForUser(req.session.id);
    res.redirect("/urls");
  }
});

//clear cookies and userURLS on logout
app.post("/logout", (req, res) => {
  req.session = null;
  userURLS = {};
  res.redirect("/login");
});

//displays the register page
app.get("/register", (req, res) => {
  let templateVars = {
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };
  res.render("register", templateVars);
});

//handles a new user registration
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  //check if req.body.email or req.body.password are not blank
  if (!helpers.checkFieldsPopulated(email, password)) {
    res.sendStatus(400);
    //check if someone is already registered
  } else if (helpers.getUserByEmail(email, urlDatabase)) {
    res.sendStatus(400);
  } else {
    //use bCrypt to auto-generate a salt and hash from plaintext:
    const hashedPassword = bcrypt.hashSync(password, salt);
    //generate a random userID using UUID/v4
    let id = helpers.generateRandomString();
    //set an encrypted cookie for the user session.id
    req.session.id = id;

    //store new user in userDB
    userDatabase[id] = {
      id: id,
      email: req.body.email,
      password: hashedPassword
    };
    // console.log(userDatabase)
    res.redirect("urls");
  }
});


//////////////////////////////////////////
///GET AND POST ROUTES FOR TINYAPP CORE///
//////////////////////////////////////////
//Test home route - currently using to experiment with objects as I learn
app.get("/", (req, res) => {
  res.send(`<h1>${greetings[3]}! Thank you for visiting the server</h1>`);
});

//Test Hello Route - Delete later as extraneous code
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

//shows urlDatabase in JSON format to registered users only
app.get("/urls.json", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };

  if (req.session.id === null || !req.session.id) {
    res.render("login", templateVars);
  } else {
    res.json(urlDatabase);
  }
});

//displays the current url database
app.get("/urls", (req, res) => {
  userURLS = helpers.getUrlsForUser(req.session.id);
  console.log(userURLS)
  let templateVars = {
    urls: userURLS,
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };

  if (!helpers.checkIsLoggedIn(req.session.id)) {
    res.render("login", templateVars);
  } else {
    res.render("urls_index", templateVars);
  }
});

//page that lets a user create a new shortened URL
app.get("/urls/new", (req, res) => {
  let templateVars = {
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };

  if (!helpers.checkIsLoggedIn(req.session.id)) {
    res.render("login", templateVars);
  } else {
    res.render("urls_new", templateVars);
  }
});

//handles a redirect from the u/shortURL to the full longURL
app.get("/u/:shortURL", (req, res) => {
  shortURL = req.params.shortURL
  if (!helpers.checkUrlExists(req.params.shortURL)) {
    return res.sendStatus(404);
  }
  const longURL = urlDatabase[`${req.params.shortURL}`]["longURL"];
  //cookie to track shortURL unique visits
  req.session[`${req.params.shortURL}`] = (req.session[`${req.params.shortURL}`] || urlDatabase[`${req.params.shortURL}`].hits) + 1
  //checking our counter for individual clicks
  console.log(req.session[`${req.params.shortURL}`])
  //add the cookies count to our hits: key in urlDatabase
  urlDatabase[`${req.params.shortURL}`].hits = req.session[`${req.params.shortURL}`]
  console.log(urlDatabase)
  res.redirect(longURL);
});

//displays information about the inputted shortURL e.g. urls/b2xVn2 will show the shortURL and long URL
app.get("/urls/:shortURL", (req, res) => {
  if (!helpers.checkUrlExists(req.params.shortURL)) {
    return res.sendStatus(404);
  }

  if (!helpers.checkIsLoggedIn(req.session.id)) {
    return res.render("user_loggedout");
  }
  //setting a cookie to track number of times /urls/tinyURL is visited
  req.session[`${req.params.shortURL}_views`] = (req.session[`${req.params.shortURL}_views`] || urlDatabase[`${req.params.shortURL}`].urlViews) + 1
  console.log(req.session[`${req.params.shortURL}_views`])
  //adds the cookies counter to our :urlViews key in userDB
  urlDatabase[`${req.params.shortURL}`].urlViews = req.session[`${req.params.shortURL}_views`]
  console.log(urlDatabase)

  const longURL = urlDatabase[req.params.shortURL].longURL;

  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: longURL,
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id),
    views: urlDatabase[`${req.params.shortURL}`].urlViews,
    hits: urlDatabase[`${req.params.shortURL}`].hits
  };
  res.render("urls_show", templateVars);
});

//allows logged in users to delete tinyURLs associated only with their account
app.post("/urls/:shortURL/delete", (req, res) => {
  if (!helpers.checkIsLoggedIn(req.session.id)) {
    res.sendStatus(403);
  } else if (!helpers.checkUserOwnsURL(req.session.id, req.params.shortURL, urlDatabase)) {
    res.sendStatus(403);
  } else {
    delete urlDatabase[`${req.params.shortURL}`];
    res.redirect("/urls");
  }
});

///allows logged in users to update tinyURLs associated only with their account
app.post("/urls/:shortURL/update", (req, res) => {
  //is the user logged in?
  if (!helpers.checkIsLoggedIn(req.session.id)) {
    res.sendStatus(403);
  } else if (!helpers.checkUserOwnsURL(req.session.id, req.params.shortURL, urlDatabase)) {
    res.sendStatus(403);
  } else {

    let longURL = req.body.longURL

    if(!longURL.includes("http://") && !longURL.includes("www")) {
    console.log("adding http://www")
    longURL = helpers.insertCharsAt(longURL, 0, "http://www.")
  }
  
  if (!longURL.includes("www")) {
    longURL = helpers.insertCharsAt(longURL, 0, "www.")
  } 

    urlDatabase[req.params.shortURL] = { 
      longURL: longURL, 
      userID: req.session.id,
      dateCreated: helpers.getTodaysDate(),
      hits: urlDatabase[req.params.shortURL].hits,
      urlViews: urlDatabase[`${req.params.shortURL}`].urlViews
    };
    console.log(urlDatabase);
    res.redirect("/urls");
  }
});

//generates new tinyURL with a random shortURL, given a unique id with generateRandomString()
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL
  //stop people adding blank data via cURL POST request
  if (!helpers.checkIsLoggedIn(req.session.id)) {
    return res.sendStatus(403);
  } 
  //correcting Users urls if they just type website.com
  if(!longURL.includes("http://") && !longURL.includes("www")) {
    console.log("adding http://www")
    longURL = helpers.insertCharsAt(longURL, 0, "http://www.")
  }
  
  if (!longURL.includes("www")) {
    longURL = helpers.insertCharsAt(longURL, 0, "www.")
  } 

    let shortURL = helpers.generateRandomString();

    //add to the urlDatabase
    urlDatabase[shortURL] = {
      longURL: longURL,
      userID: req.session.id,
      dateCreated: helpers.getTodaysDate(),
      hits: 0,
      urlViews: 0
    }; //send the new shortURL and longURL to urlDatabase
    res.redirect(`/urls/${shortURL}`); // redirection to /urls/:shortURL, where shortURL is the random string we generated.
  });


//server listen - opens the server up to listen for requests from user
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});