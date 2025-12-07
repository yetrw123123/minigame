const { Sequelize, DataTypes } = require("sequelize");

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql" /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
});

// 定义数据模型
const Counter = sequelize.define("Counter", {
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

// ============ 新增：定义游戏存档模型 ============
const GameSave = sequelize.define("GameSave", {
  // 使用微信OpenID作为主键，唯一标识一个用户
  openid: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true, // 设为主键
    unique: true,     // 唯一
  },
  // 使用 TEXT 或 JSON 类型存储复杂的游戏存档数据
  gameData: {
    type: DataTypes.TEXT('long'), // 可以存储大量文本，适合JSON
    allowNull: false,
    defaultValue: '{}', // 默认空对象
    // 注意：Sequelize 从 v6.x 开始也原生支持 DataTypes.JSON，如果您的数据库版本支持，可以尝试使用。
    // type: DataTypes.JSON,
  },
  // 可以添加一个更新时间戳，便于管理
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

// 数据库初始化方法
async function init() {
  try {
    // 同步两个模型到数据库
    await Counter.sync({ alter: true });
    console.log('Counter 表同步成功');
    
    await GameSave.sync({ alter: true }); // 重点检查这里
    console.log('GameSave 表同步成功');
    
  } catch (error) {
    // 捕获并打印详细的错误信息
    console.error('数据库表同步失败，错误详情:');
    console.error('错误名称:', error.name);
    console.error('错误信息:', error.message);
    console.error('原始错误堆栈:', error);
    
    // 如果是Sequelize的验证错误，可以打印更多细节
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeDatabaseError') {
      console.error('SQL 相关错误详情:', error.parent?.sqlMessage || error.sql);
    }
    // 可以选择让进程退出，这样云托管会显示部署失败，便于发现问题
    // process.exit(1);
  }
}

// 导出初始化方法和模型
module.exports = {
  init,
  Counter,
  GameSave,
};
