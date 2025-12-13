const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter, GameSave } = require("./db");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

// 获取计数
app.get("/api/count", async (req, res) => {
  const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

// ============ 自定义接口 START ============
// 保存游戏存档接口
app.post("/api/save_data", async (req, res) => {
  const openid = req.headers["x-wx-openid"];
  const gameData = req.body;

  if (!openid) {
    return res.send({ code: 401, message: "未获取到用户身份" });
  }
  if (!gameData || typeof gameData !== 'object') {
    return res.send({ code: 400, message: "请求体数据无效" });
  }

  try {
    // 使用 upsert 方法：如果该 openid 的记录存在则更新，不存在则创建
    const [record, created] = await GameSave.upsert({
      openid: openid,
      gameData: JSON.stringify(gameData), // 将对象转为JSON字符串存储
      updatedAt: new Date()
    }, {
      returning: true // 返回操作后的记录
    });

    console.log(`用户 ${openid} 存档${created ? '新建' : '更新'}成功`);
    res.send({
      code: 0,
      message: "存档保存成功",
      data: { openid: openid }
    });
  } catch (error) {
    console.error('保存存档失败:', error);
    res.send({ code: 500, message: "服务器内部错误，保存失败" });
  }
});

// 读取游戏存档接口
app.get("/api/load_data", async (req, res) => {
  const openid = req.headers["x-wx-openid"];

  if (!openid) {
    return res.send({ code: 401, message: "未获取到用户身份" });
  }

  try {
    const record = await GameSave.findByPk(openid); // 用主键 openid 查找

    if (record) {
      // 找到存档，解析并返回
      res.send({
        code: 0,
        message: "存档加载成功",
        data: {
          hasData: true,
          gameData: JSON.parse(record.gameData), // 将字符串解析回对象
          updatedAt: record.updatedAt
        }
      });
    } else {
      // 没有找到存档，返回默认数据
      const defaultData = { gold: 100, instanceID: 0, items: [] };
      res.send({
        code: 0,
        message: "无存档，返回默认数据",
        data: {
          hasData: false,
          gameData: defaultData
        }
      });
    }
  } catch (error) {
    console.error('读取存档失败:', error);
    res.send({ code: 500, message: "服务器内部错误，读取失败" });
  }
});
// ============ 自定义接口 END ============

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
