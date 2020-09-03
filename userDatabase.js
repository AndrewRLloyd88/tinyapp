const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);

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

module.exports = userDatabase;