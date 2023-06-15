const { User } = require("./db_entities");

async function createUser({ tg_id }) {
  try {
    const user = await User.create({
      tg_id: String(tg_id),
    });
    return user;
  } catch (err) {
    console.log("Failed to create user", user);
  }
}

function getUserByTgId({ tg_id }) {
  return User.findOne({
    where: {
      tg_id: String(tg_id),
    },
  });
}

module.exports = {
  createUser,
  getUserByTgId,
};
