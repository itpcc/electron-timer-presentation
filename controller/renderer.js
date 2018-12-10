// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var server = require('http').createServer();
var io = require('socket.io')(server);
var fs = require('fs');
var axios = require('axios');



let btnStart  = document.getElementById('btnStart');
let btnStop  = document.getElementById('btnStop');
let btnSet  = document.getElementById('btnSet');
let btnReset  = document.getElementById('btnReset');

let txtMinutes = document.getElementById('txtMinutes');
let txtSecond  = document.getElementById('txtSecond');

var setting;

fs.readFile('setting.json', 'utf8', function (err, data) {
    if (err) return console.log(err);    
    setting= JSON.parse(data);
    initSocket();  
   
});


/*function initSetting(){
	axios.get('http://localhost:3000/timePresent/server.json')
	  .then(function (response) {
		console.log(response);
		setting = response.data;
		initSocket();
	  })
	  .catch(function (error) {
		console.log(error);
	  });
}    */ 

function initSocket(){

     server.listen(setting.port);
     console.log("Listening in port", setting.port);
     io.on('connection', function(socket){
        console.log("New connection");
     socket.on('event', function(data){});
        socket.on('disconnect', function(){
            console.log('gone');
        });
    socket.emit('timer-event', { minutes: txtMinutes.value,second:txtSecond.value });
    
    });


}


initSetting();

btnStart.addEventListener('click',function(){   
    console.log("btnStart");
    io.emit('timer-event', { code: '01',codeDesc:'timeStart' });   
});

btnStop.addEventListener('click',function(){
    console.log("btnStop");
     io.emit('timer-event', { code: '02',codeDesc:'timeStop' });
});

btnReset.addEventListener('click',function(){
    console.log("btnReset");
     io.emit('timer-event', { code: '03',codeDesc:'timeReset' });
});

btnSet.addEventListener('click',function(){
    console.log("btnSet");
  io.emit('timer-event', {code: '00',codeDesc:'timeUpdate', minutes: txtMinutes.value,second:txtSecond.value });
});




