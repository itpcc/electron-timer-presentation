// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

let currentState = {
	code: '03'
};

let currentMessage = '';

let currentFinishTime = null;

io.on('connection', (socket) => {
	console.log('new connection', socket.id);

	function calculateCurrentState(){
		let timeDiffMillisec = currentFinishTime - (new Date());
		console.log("currentFinishTime", currentFinishTime);
		console.log(timeDiffMillisec)
		if(timeDiffMillisec > 0){
			return Object.assign(currentState, {
				hour:    parseInt((timeDiffMillisec) / ( 1000 * 60    * 60)),
				minute:  parseInt((timeDiffMillisec) / ( 1000 * 60 )) % 60,
				second:  parseInt(timeDiffMillisec  /   1000) % 60,
				millisec: timeDiffMillisec  %   1000
			});
		}else{
			return { code: '03',codeDesc:'timeReset' };
		}
	}

	socket.on('timer-event', (data) => {
		console.log('timer-event <', data);	
		if(data.code === '01'){ // Start
			console.log("currentState", currentState.code);
			if(currentState.code !== '00' && currentState.code !== '02')
				return socket.emit('onError', { message: 'Time must set before start' });

			currentFinishTime = new Date();
			currentFinishTime.setHours       (currentFinishTime.getHours()        + (parseInt(currentState.hour    ) || 0));
			currentFinishTime.setMinutes     (currentFinishTime.getMinutes()      + (parseInt(currentState.minute  ) || 0));
			currentFinishTime.setSeconds     (currentFinishTime.getSeconds()      + (parseInt(currentState.second  ) || 0));
			currentFinishTime.setMilliseconds(currentFinishTime.getMilliseconds() + (parseInt(currentState.millisec) || 0));
			console.log("currentFinishTime", currentFinishTime);

			currentState = Object.assign(currentState, data);
		}else if(data.code === '02'){ // pause
			if(currentState.code !== '01' || currentFinishTime === null)
				return socket.emit('error', { message: 'Time must start before pause' });

			currentState = Object.assign(calculateCurrentState(), data);
			currentFinishTime = null;
		}else{
			currentState = data;
			if(data.code === '00'){
				currentState.timeSet = {
					"hour":     parseInt(currentState.hour     ) || 0,
					"minute":   parseInt(currentState.minute   ) || 0,
					"second":   parseInt(currentState.second   ) || 0,
					"millisec": parseInt(currentState.millisec ) || 0
				}
			}
		}
		console.log('timer-event >', currentState);
		socket.broadcast.emit('timer-event', currentState);
		socket.emit('timer-event', currentState);
	});
	socket.on('message', (msg) => {
		msg = msg.trim();
		if(msg !== currentMessage){
			currentMessage = msg;
			socket.broadcast.emit('message', currentMessage);
			socket.emit('message', currentMessage);
		}

	})
	socket.on('currentStatus', () => {
		let resp;
		if(currentState.code === '01'){
			resp = calculateCurrentState();
		}else{
			resp = currentState;
		}
		resp = Object.assign(resp, {
			'message': currentMessage
		})
		console.log('currentStatus >', resp);
		socket.emit('currentStatus', resp);
	})
	// when the user disconnects.. perform this
	socket.on('disconnect', () => {
	});
});
