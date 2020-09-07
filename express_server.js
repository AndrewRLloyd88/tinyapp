const express = require("express");
const app = express();
const morgan = require('morgan');
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const helpers = require('./helpers');
const urlDatabase = require('./urlDatabase');
const userDatabase = require('./userDatabase');
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


///////////////////////////////////////////
//user account management specific routes
//-----------------------------------------
///////////////////////////////////////////

//displays login page
app.get("/login", (req, res) => {
  //check if a user is already logged in
  if (helpers.checkIsLoggedIn(req.session.id)) {
    //redirect to /urls
    return res.redirect("/urls");
  }
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
    return res.status(400).send("Please make sure to fill in both username and password fields");
  }
  //check if we can find a matching user
  const foundUser = helpers.getUserByEmail(email, userDatabase);
  if (foundUser === null || foundUser === undefined) {
    return res.status(403).send("Authentication failed. Please check your username/password.");
  }
  //does the password match?
  if (!helpers.passwordCheck(password, foundUser)) {
    return res.status(403).send("Authentication failed. Please check your username/password.");
  } 
  req.session.id = userDatabase[foundUser].id;
  userURLS = helpers.getUrlsForUser(req.session.id);
  res.redirect("/urls");
});

//clear cookies and userURLS on logout
app.post("/logout", (req, res) => {
  req.session = null;
  userURLS = {};
  res.redirect("/login");
});

//displays the register page
app.get("/register", (req, res) => {
//check if a user is already logged in
if (helpers.checkIsLoggedIn(req.session.id)) {
  //redirect to /urls
  return res.redirect("/urls");
}

  let templateVars = {
    user_id: req.session.id,
    userEmail: helpers.checkUserId(req.session.id)
  };
  res.render("register", templateVars);
});

//handles a new user registration
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  //check if email and password fields have been filled in
  if (!helpers.checkFieldsPopulated(email, password)) {
    return res.status(400).send("Please make sure to fill in both username and password fields");
  }
    //check if an email address is not already registered
  if (helpers.getUserByEmail(email, userDatabase)) {
    return res.status(400).send("An account for the specified email address already exists. Try another email address.");
  }
    //use bCrypt to auto-generate a salt and hash from plaintext:
    const hashedPassword = bcrypt.hashSync(password, salt);
    //generate a random userIDu using helper function
    let id = helpers.generateRandomString();
    //set an encrypted cookie for the user session.id
    req.session.id = id;

    //store new user in userDB
    userDatabase[id] = {
      id: id,
      email: req.body.email,
      password: hashedPassword
    };
    res.redirect("urls");
  
});


//////////////////////////////////////////
///GET AND POST ROUTES FOR TINYAPP CORE///
//////////////////////////////////////////
//Home route redirects to login if not /logged in or /urls if logged in
app.get("/", (req, res) => {
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
  shortURL = req.params.shortURL;
  if (!helpers.checkUrlExists(req.params.shortURL)) {
    return res.sendStatus(404);
  }
  const longURL = urlDatabase[`${req.params.shortURL}`]["longURL"];
  //cookie to track shortURL unique visits
  req.session[`${req.params.shortURL}`] = (req.session[`${req.params.shortURL}`] || urlDatabase[`${req.params.shortURL}`].hits) + 1;
  //checking our counter for individual clicks
  //add the cookies count to our hits: key in urlDatabase
  urlDatabase[`${req.params.shortURL}`].hits = req.session[`${req.params.shortURL}`];
  res.redirect(longURL);
});

//displays information about the inputted shortURL e.g. urls/b2xVn2 will show the shortURL and long URL
app.get("/urls/:shortURL", (req, res) => {
  //checks if urlExists in urlDB
  if (!helpers.checkUrlExists(req.params.shortURL)) {
    return res.status(404).send("shortURL does not exist.");
  }
  //checks if user is logged in and redirects to an error page if they aren't.
  if (!helpers.checkIsLoggedIn(req.session.id)) {
    return res.render("user_loggedout");
  }
  //checks if user owns this URL and blocks them accessing the edit page if they dont
  if (!helpers.checkUserOwnsURL(req.session.id, req.params.shortURL, urlDatabase)) {
    return res.status(403).send("You do not have permission to edit this shortURL");
  }
  //setting a cookie to track number of times /urls/tinyURL is visited
  req.session[`${req.params.shortURL}_views`] = (req.session[`${req.params.shortURL}_views`] || urlDatabase[`${req.params.shortURL}`].urlViews) + 1;
  //adds the cookies counter to our :urlViews key in userDB
  urlDatabase[`${req.params.shortURL}`].urlViews = req.session[`${req.params.shortURL}_views`];

  const longURL = urlDatabase[req.params.shortURL].longURL;

  //send variables across to use in our urls_show ejs template in /views
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
    return res.sendStatus(403);
  } else if (!helpers.checkUserOwnsURL(req.session.id, req.params.shortURL, urlDatabase)) {
    return res.sendStatus(403);
  } else {

    let longURL = req.body.longURL;

    if (!longURL.includes("http://") && !longURL.includes("www")) {
      longURL = helpers.insertCharsAt(longURL, 0, "http://www.");
    }
  
    if (!longURL.includes("www")) {
      longURL = helpers.insertCharsAt(longURL, 0, "www.");
    }

    urlDatabase[req.params.shortURL] = {
      longURL: longURL,
      userID: req.session.id,
      dateCreated: helpers.getTodaysDate(),
      hits: urlDatabase[req.params.shortURL].hits,
      urlViews: urlDatabase[`${req.params.shortURL}`].urlViews
    };
    res.redirect("/urls");
  }
});

//generates new tinyURL with a random shortURL, given a unique id with generateRandomString()
app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  //stop people adding blank data via cURL POST request
  if (!helpers.checkIsLoggedIn(req.session.id)) {
    return res.sendStatus(403);
  }
  //prepends http://www. if user has not included either in longURL
  if (!longURL.includes("http://") && !longURL.includes("www")) {
    longURL = helpers.insertCharsAt(longURL, 0, "http://www.");
  }
  //adds www. if not present in URL user creates.
  if (!longURL.includes("www")) {
    longURL = helpers.insertCharsAt(longURL, 0, "www.");
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