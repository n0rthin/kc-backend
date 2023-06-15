const { Sequelize, Model, DataTypes } = require("sequelize");
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

class Article extends Model {}
class User extends Model {}
class Chunk extends Model {}
class Insight extends Model {}
class Delivery extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tg_id: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    sequelize,
    modelName: "users",
    createdAt: "created_at",
    updatedAt: false,
  }
);

Article.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    sequelize,
    modelName: "articles",
    createdAt: "created_at",
    updatedAt: false,
  }
);

Chunk.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    article_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Article,
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    sequelize,
    modelName: "chunks",
    createdAt: "created_at",
    updatedAt: false,
  }
);

Insight.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    chunk_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Chunk,
        key: "id",
      },
    },
    insight: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    sequelize,
    modelName: "insights",
    createdAt: "created_at",
    updatedAt: false,
  }
);

Delivery.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "id",
      },
    },
    insight_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Insight,
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    sequelize,
    modelName: "deliveries",
    createdAt: "created_at",
    updatedAt: false,
  }
);

Article.hasMany(Chunk, { foreignKey: "article_id" });
Chunk.belongsTo(Article, { foreignKey: "article_id" });

Chunk.hasMany(Insight, { foreignKey: "chunk_id" });
Insight.belongsTo(Chunk, { foreignKey: "chunk_id" });

User.belongsToMany(Article, { through: "User_Article" });
Article.belongsToMany(User, { through: "User_Article" });

User.hasMany(Delivery, { foreignKey: "user_id" });
Delivery.belongsTo(User, { foreignKey: "user_id" });

Insight.hasMany(Delivery, { foreignKey: "insight_id" });
Delivery.belongsTo(Insight, { foreignKey: "insight_id" });

sequelize.sync();

module.exports = {
  Article,
  Chunk,
  Insight,
  User,
  Delivery,
};
