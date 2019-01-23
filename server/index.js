const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const timesyncServer = require('timesync/server');

const TIMER_CODE = {
	TIME_SET: '00',
	START:    '01',
	PAUSE:    '02',
	STOP:     '03'
};

const TIMER_CODE_DESC = {
	[TIMER_CODE.TIME_SET]: 'timeUpdate',
	[TIMER_CODE.START]:    'timeStart',
	[TIMER_CODE.PAUSE]:    'timePause',
	[TIMER_CODE.STOP]:     'timeReset'
};

const TIMER_ZERO_TEMPLATE = {
	"hour":     0,
	"minute":   0,
	"second":   0,
	"millisec": 0
};

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.COUNTDOWN_PASSWORD || "secret";

server.listen(PORT, () => {
	console.log('Server listening at port %d, authen password %s', PORT, PASSWORD);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/timesync', express.static(path.join(__dirname, 'node_modules/timesync/dist')));

let currentState = {
	code: TIMER_CODE.STOP,
	timeSet: TIMER_ZERO_TEMPLATE
};

let currentMessage = '';

let currentFinishTime = null;

io.on('connection', (socket) => {
	console.log('New connection', socket.id);

	function calculateCurrentState(){
		let timeDiffMillisec = currentFinishTime - (new Date());
		if (timeDiffMillisec > 0) {
			return Object.assign(currentState, {
				timeSet:{
					hour:    parseInt((timeDiffMillisec) / ( 1000 * 60    * 60)),
					minute:  parseInt((timeDiffMillisec) / ( 1000 * 60 )) % 60,
					second:  parseInt(timeDiffMillisec  /   1000) % 60,
					millisec: timeDiffMillisec  %   1000
				}
			});
		}else{
			currentFinishTime = null;
			return { code: TIMER_CODE.STOP, timeSet: TIMER_ZERO_TEMPLATE };
		}
	}

	async function authenMiddleware(data){
		if(data.authenPassword !== PASSWORD)
			throw Error('Authentication Error');
	}

	function emitError(error){
		return socket.emit('onError', { message: error.message || 'Unknown Error' });
	}

	function currentStatusWithDesc(isBroadcast){
		return Object.assign({
			finishTime: currentFinishTime,
			codeDesc: TIMER_CODE_DESC[currentState.code] || ''
		}, currentState);
	}

	socket.on('timer-event', async (data) => {
		try{
			await authenMiddleware(data);
			console.log("timer-event [data]", data);
			switch(data.code){
				case TIMER_CODE.TIME_SET:
					currentState = {
						code: TIMER_CODE.TIME_SET,
						timeSet: {
							"hour":     parseInt(data.timeSet.hour     ) || 0,
							"minute":   parseInt(data.timeSet.minute   ) || 0,
							"second":   parseInt(data.timeSet.second   ) || 0,
							"millisec": parseInt(data.timeSet.millisec ) || 0,
						}
					};
					currentFinishTime = null;
				break;
				case TIMER_CODE.START:
					if(
						currentState.code !== TIMER_CODE.TIME_SET && 
						currentState.code !== TIMER_CODE.PAUSE
					)
						throw Error('Time must set before start');

					currentFinishTime = new Date()
						currentFinishTime.setHours       (currentFinishTime.getHours()        + (parseInt(currentState.timeSet.hour    ) || 0));
						currentFinishTime.setMinutes     (currentFinishTime.getMinutes()      + (parseInt(currentState.timeSet.minute  ) || 0));
						currentFinishTime.setSeconds     (currentFinishTime.getSeconds()      + (parseInt(currentState.timeSet.second  ) || 0));
						currentFinishTime.setMilliseconds(currentFinishTime.getMilliseconds() + (parseInt(currentState.timeSet.millisec) || 0));

					currentState.code = TIMER_CODE.START; // Let's rock n' roll, baby!
				break;
				case TIMER_CODE.PAUSE:
					if(
						currentState.code !== TIMER_CODE.START || 
						currentFinishTime === null // Just to make sure we don't fuck up by re-pause.
					)
						throw Error('Time must start before pause');

					currentState = calculateCurrentState();
					if(currentState.code !== TIMER_CODE.STOP) currentState.code = TIMER_CODE.PAUSE;
					currentFinishTime = null; // Please don't kill anyone, yet.
				break;
				case TIMER_CODE.STOP:
					currentState = {
						code: TIMER_CODE.STOP,
						timeSet: TIMER_ZERO_TEMPLATE
					};
					currentFinishTime = null;
				break;
				default:
					throw Error(`Unknown timer code. ${data.code}`);
				break;
			}

			const eventEmitObj = currentStatusWithDesc();

			socket.broadcast.emit('timer-event', eventEmitObj); // It broadcast to everyone... except itself! 🙃
			socket          .emit('timer-event', eventEmitObj); // So, you have to do it separately.
			// console         .log ('currentState', eventEmitObj);
		}catch(error){
			return emitError(error);
		}
	});

	socket.on('message', async (data) => {
		try{
			await authenMiddleware(data);

			const msg = data.message.trim();

			//Why you have to emit the same message over, and over again unnecessary.
			if (msg !== currentMessage) {
				currentMessage = msg;
				socket.broadcast.emit('message', currentMessage);
				socket          .emit('message', currentMessage);
				// console         .log ('message', currentMessage);
			}
		}catch(error){
			return emitError(error);
		}
	});

	socket.on('currentStatus', () => {
		if (currentState.code === TIMER_CODE.START) {
			currentState = calculateCurrentState(); // Check to make sure that we don't mess up.
			if(currentState.code !== TIMER_CODE.START)
				console.log('currentState', currentState);
		}

		const resp = Object.assign(currentStatusWithDesc(), {
			'message': currentMessage
		})

		socket.emit('currentStatus', resp);
	});

	socket.on('timesync', function (data) {
		// console.log('timesync', data);
		socket.emit('timesync', {
			id: data && 'id' in data ? data.id : null,
			result: Date.now()
		});
	});

});
