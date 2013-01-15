var port = 20105;

// websocketとexpressの読み込み
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
server.listen(port);
io.set("log level", 1);

// expressの設定と起動
app.configure(function() {
  app.use(express.static(__dirname + "/public"));
});
console.log("Server started.");

var player_list = new Array(); // ログイン中プレイヤー情報を名前から得る関数へのハッシュ

// 通信プロトコル
io.sockets.on("connection", function(socket) {
  var player = {
    login_name : "",
    x : 0,
    y : 0,
    message : "…", // フキダシの中身
  };

  console.log("connect new client.");

  // ログイン名を送ってきた時は新規ログインの処理
  socket.on("name", function(text) {
    console.log("name: " + text);
    // 名前が重複していないかチェックする
    for (var i in player_list) {
      var c = player_list[i];
      if (c.login_name === text) {
        socket.emit("retry_login");
        return;
      }
    }

    // ログインを許可して初期情報を送ってもらう
    socket.emit("logined");

    player.login_name = text;

    // 既に参加中のユーザに新規ユーザを知らせる
    socket.broadcast.emit("name", player.login_name);


    // 新規ユーザにそれまでにログインしてるプレイヤー情報を送る
    for (var i in player_list) {
      var c = player_list[i]; // ログイン中プレイヤーリストからプレイヤー情報取得
      socket.emit("name", c.login_name);
      socket.emit("position:" + c.login_name,
                  { x : c.x, y : c.y , direction: c.direction});
      socket.emit("message:" + c.login_name, c.message);
    }
    // ログイン中プレイヤーリストへの登録
    player_list[ player.login_name ] = player;
  });
  
  // 移動処理
  socket.on("position", function(pos) {
    // console.log("position:" + player.login_name + " " + text);
    player.x = pos.x;
    player.y = pos.y;
    player.direction = pos.direction;
    socket.broadcast.emit("position:" + player.login_name, pos);
  });

  // こちらがメッセージを受けた時の処理
  socket.on("message", function(text) {
    console.log("message:" + player.login_name + " " + text);
    player.message = text;
    socket.broadcast.emit("message:" + player.login_name, text);
  });

  // 切断した時の処理
  socket.on("disconnect", function() {
    console.log("disconnect:" + player.login_name);
    socket.broadcast.emit("disconnect:" + player.login_name);
    // ログイン中プレイヤーリストからの削除
    delete player_list[ player.login_name ];
  });
});

