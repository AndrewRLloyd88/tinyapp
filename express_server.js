const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// set the view engine to ejs
app.set("view engine", "ejs");


let userURLS = {};

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

//userDatabase with two test entries - not persistent over server resets
const userDatabase = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

//test array for use on "/" route - will become surplus to requirements later on
const greetings = ["Hi", "Hello", "welcome", "Wilkommen"];

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
const emailLookup = (email) => {
  for (const users in userDatabase) {
    //does the submitted email match an email in our db?
    if (email === userDatabase[users].email) {
      return true;
    }
  }
  return false;
};

//checks if password matches password stored in userDB  -- refactor these functions
const passwordCheck = (password) => {
  for (const users in userDatabase) {
    //does the submitted email match an email in our db?
    if (password === userDatabase[users].password) {
      return true;
    }
  }
  return false;
}

//checks if fields are empty -- refactor this check
const checkFieldsPopulated = (email, password) => {
  if (email === "" && password === "") {
    //send a 400 error - Bad Request
    return false;
  }
  return true;
}

//checks what value req.cookies.user_id is. If undefined user !== logged in
const isLoggedIn = (req) => {

  if (req.cookies.user_id === undefined) {
    return false;
  } else {
    return true;
  }
}


//returns the URLs where the userID is equal to the field of the currently logged in user
const urlsForUser = (id) => {
  //remember to clear userURLS
  userURLS = {}
  for (const url in urlDatabase) {
    if (id === urlDatabase[url].userID) {
      userURLS[url] = urlDatabase[url].longURL
    }
  }
  console.log(userURLS)
  return userURLS;
}

const checkUserOwnsURL = (id, request) => {
  // console.log("request: " + request)
  for (urls in urlDatabase) {
    if (urlDatabase[request].userID !== id) {
      // console.log(request.user_id + " " + "in checkUserOwnsUrl")
      return false
    } else {
      return true;
    }
  }
}


// Edge cases

// What would happen if a client requests a non-existent shortURL?
//timeout because the resource has been found but it cant re-direct to anything.

// What happens to the urlDatabase when the server is restarted?
// What type of status code do our redirects have? What does this status code mean?
// 302 Found - This response code means that the URI of requested resource has been changed temporarily. Further changes in the URI might be made in the future. Therefore, this same URI should be used by the client in future requests.

//Routes

///////////////////////////////////
//user management specific routes
//---------------------------------
///////////////////////////////////
//route that handles login button and sets cookie users name


//displays login page
app.get("/login", (req, res) => {
  let templateVars = { user_id: req.cookies["user_id"], userEmail: checkUserId(req.cookies['user_id']) };
  res.render('login', templateVars);
})

//handles login requests
app.post("/login", (req, res) => {
  //are our login fields populated?
  if (!checkFieldsPopulated(req.body.email, req.body.password)) {
    res.sendStatus(400);
  }
  //does email match an email on our db?
  else if (!emailLookup(req.body.email)) {
    res.sendStatus(403);
  }
  //does the password match?
  else if (!passwordCheck(req.body.password)) {
    res.sendStatus(403);
  } else {
    //need to check all users to see if an email matches and if so set cookie to user_id : userDatabase[randomID]
    //refactor this logic
    for (const users in userDatabase) {
      if (req.body.email === userDatabase[users].email) {
        res.cookie("user_id", userDatabase[users].id);
        userURLS = urlsForUser(req.cookies.user_id)
      }
    }

    res.redirect("/urls");
  }
});

//handles logout button and resets cookie to "" when user logs out
app.post("/logout", (req, res) => {
  //set the user_id cookie to an empty string on logout
  res.clearCookie("user_id");
  userURLS = {}
  res.redirect("/login");
});

//displays the register page
app.get("/register", (req, res) => {
  //change template Vars to use user ID now
  let templateVars = { user_id: req.cookies["user_id"], userEmail: checkUserId(req.cookies['user_id']) };
  res.render("register", templateVars);
});

//handles a new user registration
app.post("/register", (req, res) => {
  //check if req.body.email or req.body.password are not blank
  if (req.body.email === "" || req.body.password === "") {
    //send a 400 error - Bad Request
    res.sendStatus(400);
  }
  //check if someone tries to register an already registered email address
  else if (emailLookup(req.body.email)) {
    res.sendStatus(400);
  } else {

    //generate a random userID
    let id = generateRandomString();
    //implement a loop to check if userID/email exists?
    //store user in userDB
    userDatabase[id] = {
      id: id,
      email: req.body.email,
      password: req.body.password
    };
    //cookies now use randomly generated userID
    res.cookie("user_id", id);
    console.log(userDatabase); //log userDB to see if user was added OK
    res.redirect("urls");
  }
});


////////////////
///GET ROUTES///
////////////////
//Test home route - currently using to experiment with objects as I learn
app.get("/", (req, res) => {
  res.send(`<h1>${greetings[3]}! Thank you for visiting the server</h1>`);
});

//added through duration of the work - shows tinyURLS and largeURLS in JSON format
app.get("/urls.json", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    user_id: req.cookies["user_id"],
    userEmail: checkUserId(req.cookies['user_id'])
    //any other vars
  };

  //base code to check if a cookie exists
  if (req.cookies.user_id === undefined) {
    // console.log("I am not logged in as a user")
    res.render("login", templateVars);
  } else {
    // if !loggedIn{
    //   res.sendStatus(403);
    // } else {
    res.json(urlDatabase);
  }
});

//displays the current url database
app.get("/urls", (req, res) => {

  urlsForUser(req.cookies.user_id)

  let templateVars = {
    urls: userURLS,
    user_id: req.cookies["user_id"],
    userEmail: checkUserId(req.cookies['user_id'])
    //any other vars
  };


  if (!isLoggedIn(req)) {
    res.render("login", templateVars);
  } else {


    res.render("urls_index", templateVars);
  }
});

//page that lets a user create a new shortened URL
app.get("/urls/new", (req, res) => {
  let templateVars = { user_id: req.cookies["user_id"], userEmail: checkUserId(req.cookies['user_id']) };

  if (!isLoggedIn(req)) {
    res.render("login", templateVars);
  } else {
    res.render("urls_new", templateVars);
  }
});

//handles a redirect from the u/shortURL to the full longURL
app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[`${req.params.shortURL}`]["longURL"]
  res.redirect(longURL);
});

//displays information about the inputted shortURL e.g. urls/b2xVn2 will show the shortURL and long URL
app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[`${req.params.shortURL}`].longURL,
    user_id: req.cookies["user_id"],
    userEmail: checkUserId(req.cookies['user_id'])
  };

  res.render("urls_show", templateVars);
});

//handles a deletion request using the delete button on urls/ route
app.post("/urls/:shortURL/delete", (req, res) => {
  if (!isLoggedIn(req)) {
    res.sendStatus(403);
  } else if (!checkUserOwnsURL(req.cookies.user_id)) {
    res.sendStatus(403);
  } else {
    delete urlDatabase[`${req.params.shortURL}`];
    res.redirect("/urls");
  }
});

//updates an existing entries long URL redirects the user to /urls
app.post("/urls/:shortURL/update", (req, res) => {
  //is the user logged in?
  if (!isLoggedIn(req)) {
    res.sendStatus(403);
  } else if (!checkUserOwnsURL(req.cookies.user_id, req.params.shortURL)) {
    // console.log(req.cookies.user_id)
    // console.log()
    res.sendStatus(403);
  } else {
    urlDatabase[req.params.shortURL] = { longURL: req.body.longURL, userID: req.cookies.user_id };
    console.log(urlDatabase);
    res.redirect("/urls");

  }
});

//generates new tinyURL with a random shortURL using the generateRandomString() function
app.post("/urls", (req, res) => {
  // console.log(req.body);  // Log the POST request body to the console
  let shortURL = generateRandomString(); //Log the randomly generated tinyURL to the console
  console.log(req.body.longURL)
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: req.cookies.user_id }; //send the new shortURL and longURL to urlDatabase
  console.log(urlDatabase); //log the urlDatabase to check the new values get added ok.
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

