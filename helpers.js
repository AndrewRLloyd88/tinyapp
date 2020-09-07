const urlDatabase = require('./urlDatabase');
const userDatabase = require('./userDatabase');
const uuid = require('uuid');
const bcrypt = require('bcrypt');

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
      return foundUser;
    }
  }
  return false;
};

//checks if password matches password stored in userDB  -- refactor these functions
const passwordCheck = (password, foundUser) => {
  if (!foundUser) {
    return false;
  }
  //does the submitted email match an email in our db?
  if (bcrypt.compareSync(password, userDatabase[foundUser].password)) {
    return foundUser;
  }
  return false;
};

//checks if fields are empty -- refactor this check
const checkFieldsPopulated = (email, password) => {
  if (email === "" || password === "") {
    //send a 400 error - Bad Request
    return false;
  }
  return true;
};

//checks what value req.cookies.user_id is. If undefined user !== logged in
const checkIsLoggedIn = (req) => {
  if (req === undefined) {
    return false;
  } else {
    return true;
  }
};

//grabs the urls associated with the logged in users id
const getUrlsForUser = (id) => {
  userURLS = {};
  for (const url in urlDatabase) {
    //does the user own any urls in our database?
    if (id === urlDatabase[url].userID) {
      //assign any found to UserURLS as {shorURL : LongURL}
      userURLS[url] = {
        longURL: urlDatabase[url].longURL,
        dateCreated: urlDatabase[url].dateCreated,
        hits: urlDatabase[url].hits,
        urlViews: urlDatabase[url].urlViews
      };
    }
  }
  return userURLS;
};

//checks if the user owns the url by checking the urlID and their sessionID against the DB
const checkUserOwnsURL = (id, request, urlDatabase) => {
  if (urlDatabase[request].userID !== id) {
    return false;
  } else {
    return true;
  }
};

//checks if the requested urls/tinyURL exists in the database
const checkUrlExists = (req) => {
  for (const urls in urlDatabase) {
    if (req === urls) {
      return true;
    }
  }
  return false;
};

//used for url creation to see if a user entered http://www. or www. and prepends if missing
const insertCharsAt = (str, index, value) => {
  return str.substr(0, index) + value + str.substr(index);
};

//returns 6 random characters from characters and associates the new tinyURL to a longURL
const generateRandomString = () => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const getTodaysDate = () => {
  const todaysDate = new Date();
  const date = todaysDate.getDate();
  const month = todaysDate.getMonth() + 1; // Since getMonth() returns
  const year = todaysDate.getFullYear();
  return date + "/" + month + "/" + year;
};

module.exports = {
  checkUserId,
  getUserByEmail,
  passwordCheck,
  checkFieldsPopulated,
  checkIsLoggedIn,
  getUrlsForUser,
  checkUserOwnsURL,
  checkUrlExists,
  insertCharsAt,
  generateRandomString,
  getTodaysDate

};