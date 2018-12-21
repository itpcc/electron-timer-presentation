const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.COUNTDOWN_PASSWORD || "secret";

server.listen(PORT, () => {
	console.log('Server listening at port %d, authen password %s', PORT, PASSWORD);
});

app.use(express.static(path.join(__dirname, 'public')));

let currentState = {
	code: '03'
};

let currentMessage = '';

let currentFinishTime = null;

io.on('connection', (socket) => {
	console.log('New connection', socket.id);

	function calculateCurrentState(){
		let timeDiffMillisec = currentFinishTime - (new Date());

		if (timeDiffMillisec > 0) {
			return Object.assign(currentState, {
				hour:    parseInt((timeDiffMillisec) / ( 1000 * 60    * 60)),
				minute:  parseInt((timeDiffMillisec) / ( 1000 * 60 )) % 60,
				second:  parseInt(timeDiffMillisec  /   1000) % 60,
				millisec: timeDiffMillisec  %   1000,
			});
		}else{
			return { code: '03',codeDesc:'timeReset' };
		}
	}

	socket.on('timer-event', (data) => {
		if (data.authenPassword === undefined || data.authenPassword !== PASSWORD) {
			return socket.emit('onError', { message: 'Authentication Error' });
		}

		if (data.code === '01') {
			if(currentState.code !== '00' && currentState.code !== '02')
				return socket.emit('onError', { message: 'Time must set before start' });

			currentFinishTime = new Date()
			currentFinishTime.setHours       (currentFinishTime.getHours()        + (parseInt(currentState.hour    ) || 0));
			currentFinishTime.setMinutes     (currentFinishTime.getMinutes()      + (parseInt(currentState.minute  ) || 0));
			currentFinishTime.setSeconds     (currentFinishTime.getSeconds()      + (parseInt(currentState.second  ) || 0));
			currentFinishTime.setMilliseconds(currentFinishTime.getMilliseconds() + (parseInt(currentState.millisec) || 0));

			currentState = Object.assign(currentState, data);
		} else if(data.code === '02') {
			if(currentState.code !== '01' || currentFinishTime === null)
				return socket.emit('onError', { message: 'Time must start before pause' });

			currentState = Object.assign(calculateCurrentState(), data);
			currentFinishTime = null;
		}else{
			currentState = data;
			if (data.code === '00') {
				currentState.timeSet = {
					"hour":     parseInt(currentState.hour     ) || 0,
					"minute":   parseInt(currentState.minute   ) || 0,
					"second":   parseInt(currentState.second   ) || 0,
					"millisec": parseInt(currentState.millisec ) || 0,
				}
			}
		}

		socket.broadcast.emit('timer-event', currentState);
		socket.emit('timer-event', currentState);
	});

	socket.on('message', (data) => {
		if (data.authenPassword === undefined || data.authenPassword !== PASSWORD) {
			return socket.emit('onError', { message: 'Authentication Error' });
		}

		const msg = data.message.trim();

		if (msg !== currentMessage) {
			currentMessage = msg;
			socket.broadcast.emit('message', currentMessage);
			socket.emit('message', currentMessage);
		}
	});

	socket.on('currentStatus', () => {
		let resp;
		if (currentState.code === '01') {
			resp = calculateCurrentState();
		} else {
			resp = currentState;
		}
		resp = Object.assign(resp, {
			'message': currentMessage
		})

		socket.emit('currentStatus', resp);
	});
});
