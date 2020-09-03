const express = require("express");
const app = express();
const morgan = require('morgan');
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
//generate 10 salt rounds
const salt = bcrypt.genSaltSync(10);
const cookieSession = require('cookie-session')

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

//returns 6 random characters from characters and associates the new tinyURL to a longURL
const generateRandomString = () => {
  const randomID = uuid.v4().substr(0, 6);
  return randomID;
};

//database is not yet persistent when server restarts
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID"
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user2RandomID"
  },
  "S152tx": {
    longURL: "https://www.tsn.ca/",
    userID: "userRandomID"
  }
};

// userDatabase["foundUser"].password
//userDatabase with two test entries - not persistent over server resets
const userDatabase = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", salt)
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", salt)
  }
};

//test array for use on "/" route - will become surplus to requirements later on
const greetings = ["Hi", "Hello", "welcome", "Wilkommen"];


//functions refactor

const checkUserParams = (email, database) => {
  for (const user in userDatabase) {

  }
}


//checks user_id cookie and sees if there is a matching userID in the database. --refactor these functions
const checkUserId = (cookie) => {
  if (cookie !== "") {
    for (const users in userDatabase) {
      if (cookie === userDatabase[users].id) {
        //return users email to use in the header partial
        return userDatabase[users].email;
      }
    }
  } else {
    return undefined;
  }
};

//check we are not creating duplicate users by checking req.body.email against db --refactor these functions
const getUserByEmail = (email, database) => {
  for (const users in userDatabase) {
    //does the submitted email match an email in our db?
    if (email === userDatabase[users].email) {
      const foundUser = users;
      console.log(foundUser + "in getUserByEmail")
      return foundUser;
    }
  }
  console.log("before false");
  return false;
};

//checks if password matches password stored in userDB  -- refactor these functions
const passwordCheck = (password, foundUser) => {
  console.log(`in passwordCheck foundUser is:  ${foundUser}`)
  console.log(userDatabase["foundUser"])
  //does the submitted email match an email in our db?
  if (bcrypt.compareSync(password, userDatabase[foundUser].password)) {
    // if (password === userDatabase[users].password) {

    return foundUser;
  }
  return false;
};

//checks if fields are empty -- refactor this check
const checkFieldsPopulated = (email, password) => {
  if (email === "" && password === "") {
    //send a 400 error - Bad Request
    return false;
  }
  return true;
};

//checks what value req.cookies.user_id is. If undefined user !== logged in
const isLoggedIn = (req) => {
  if (req === undefined) {
    return false;
  } else {
    return true;
  }
};


//returns the URLs where the userID is equal to the field of the currently logged in user
const urlsForUser = (id) => {
  //remember to clear userURLS
  userURLS = {};
  for (const url in urlDatabase) {
    if (id === urlDatabase[url].userID) {
      userURLS[url] = urlDatabase[url].longURL;
    }
  }
  console.log(userURLS);
  return userURLS;
};

//checks the incoming request from a user to make sure they own that url.
//Stops users editing other users shortURLS if they dont own it.
// req.session.id
const checkUserOwnsURL = (id, request) => {
  console.log("request: " + id, request)
  for (const urls in urlDatabase) {
    if (urlDatabase[request].userID !== id) {
      // console.log(request.user_id + " " + "in checkUserOwnsUrl")
      return false;
    } else {
      return true;
    }
  }
};


// Edge cases

// What would happen if a client requests a non-existent shortURL?
//timeout because the resource has been found but it cant re-direct to anything.

// What happens to the urlDatabase when the server is restarted?
// What type of status code do our redirects have? What does this status code mean?
// 302 Found - This response code means that the URI of requested resource has been changed temporarily. Further changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.



///////////////////////////////////////////
//user account management specific routes
//-----------------------------------------
///////////////////////////////////////////

//displays login page
app.get("/login", (req, res) => {
  let templateVars = { 
    user_id: req.session.id, 
    userEmail: checkUserId(req.session.id) 
  };
  res.render('login', templateVars);
});

//handles login requests
app.post("/login", (req, res) => {
  const { email, password } = req.body

  //are our login fields populated?
  if (!checkFieldsPopulated(email, password)) {
    res.sendStatus(400);
  }
  //check if we can find a matching user
  const foundUser = getUserByEmail(email)
  if (foundUser === null) {
    res.sendStatus(403);
  }
  //does the password match?
  if (!passwordCheck(password, foundUser)) {
    res.sendStatus(403);
  } else {
    req.session.id = userDatabase[foundUser].id;
    userURLS = urlsForUser(req.session.id);
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
    userEmail: checkUserId(req.session.id) 
  };
  res.render("register", templateVars);
});

//handles a new user registration
app.post("/register", (req, res) => {
  const { email, password } = req.body

  //check if req.body.email or req.body.password are not blank
  if (!checkFieldsPopulated(email, password)) {
    res.sendStatus(400);
    //check if someone is already registered
  } else if (getUserByEmail(email)) {
    res.sendStatus(400);
  } else {
    //use bCrypt to auto-generate a salt and hash from plaintext:
    const hashedPassword = bcrypt.hashSync(password, salt);
    //generate a random userID using UUID/v4
    let id = generateRandomString();
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

//added through duration of the work - shows tinyURLS and largeURLS in JSON format
app.get("/urls.json", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user_id: req.session.id,
    userEmail: checkUserId(req.session.id)
  };

  //base code to check if a cookie exists
  if (req.session.id === null) {
    res.render("login", templateVars);
  } else {
    res.json(urlDatabase);
  }
});

//displays the current url database
app.get("/urls", (req, res) => {
  urlsForUser(req.session.id);

  let templateVars = {
    urls: userURLS,
    user_id: req.session.id,
    userEmail: checkUserId(req.session.id)
  };


  if (!isLoggedIn(req.session.id)) {
    res.render("login", templateVars);
  } else {
    res.render("urls_index", templateVars);
  }
});

//page that lets a user create a new shortened URL
app.get("/urls/new", (req, res) => {
  let templateVars = { user_id: req.session.id, userEmail: checkUserId(req.session.id) };

  if (!isLoggedIn(req.session.id)) {
    res.render("login", templateVars);
  } else {
    res.render("urls_new", templateVars);
  }
});

//handles a redirect from the u/shortURL to the full longURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[`${req.params.shortURL}`]["longURL"];
  res.redirect(longURL);
});

//displays information about the inputted shortURL e.g. urls/b2xVn2 will show the shortURL and long URL
app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[`${req.params.shortURL}`].longURL,
    user_id: req.session.id,
    userEmail: checkUserId(req.session.id)
  };

  res.render("urls_show", templateVars);
});

//handles a deletion request using the delete button on urls/ route
app.post("/urls/:shortURL/delete", (req, res) => {
  if (!isLoggedIn(req.session.id)) {
    res.sendStatus(403);
  } else if (!checkUserOwnsURL(req.session.id, req.params.shortURL)) {
    res.sendStatus(403);
  } else {
    delete urlDatabase[`${req.params.shortURL}`];
    res.redirect("/urls");
  }
});

//updates an existing entries long URL redirects the user to /urls
app.post("/urls/:shortURL/update", (req, res) => {
  //is the user logged in?
  if (!isLoggedIn(req.session.id)) {
    res.sendStatus(403);
  } else if (!checkUserOwnsURL(req.session.id, req.params.shortURL)) {
    res.sendStatus(403);
  } else {
    urlDatabase[req.params.shortURL] = { longURL: req.body.longURL, userID: req.session.id };
    res.redirect("/urls");

  }
});

//generates new tinyURL with a random shortURL using the generateRandomString() function
app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    userID: req.session.id
  }; //send the new shortURL and longURL to urlDatabase
  res.redirect(`/urls/${shortURL}`); // redirection to /urls/:shortURL, where shortURL is the random string we generated.
});

//server listen - opens the server up to listen for requests from user
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});