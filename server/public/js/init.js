window.__TIME_RUNNER_INTERVAL__ = 0;
window.__FINISH_TIME__ = null;
window.__DISPLAY_MODE__ = "workshop"; // or "workshop"

function ready(fn) {
	if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}

ready(function(){
	if(window.__DISPLAY_MODE__ === "present"){
		document.querySelector(".hour").style = "display: none";
		document.querySelector(".hour+.clock-separator").style = "display: none";
		document.querySelector(".sponsors").style = "display: none";
	}
	const socket = io();

	// ----------------------------- timesync BEGIN -----------------------------
	var ts = timesync.create({
		server: socket,
		interval: 1000
	});
	ts.on('sync', function (state) {
		// console.log('sync ' + state + '');
	});
	ts.on('change', function (offset) {
		console.log('changed offset: ' + offset + ' ms');
	});
	ts.send = function (socket, data, timeout) {
		//console.log('send', data);
		return new Promise(function (resolve, reject) {
			var timeoutFn = setTimeout(reject, timeout);
			socket.emit('timesync', data, function () {
				clearTimeout(timeoutFn);
				resolve();
			});
		});
	};
	function getCurrentTime(){
		var currentTime = new Date(ts.now());
		if(!currentTime || isNaN(currentTime))
			currentTime = new Date();
		return currentTime;
	}
	// ------------------------------ timesync END ------------------------------

	if (localStorage.getItem("password") !== null) {
		authen(localStorage.getItem("password"));
	}

	function authen(password) {
		localStorage.setItem("password", password);
		
		document.querySelector(".section-editor").style = "display: block";
		document.querySelector(".fixed-action-btn").style = "display: block";
	}

	let darkmode = false;

	function enableDarkmode() {
		if (darkmode) return;

		const soundtrackAudio = document.getElementById("soundtrack"); 
		soundtrackAudio.play();

		document.body.classList.add("darkmode");
	}

	function disableDarkMode(){
		const soundtrackAudio = document.getElementById("soundtrack"); 
		soundtrackAudio.currentTime = 0;
		soundtrackAudio.pause();

		document.body.classList.remove("darkmode");
	}

	function emitMessage(pipe, state) {
		const authenPassword = localStorage.getItem("password") || "secret";
		socket.emit(pipe, {...state, authenPassword});
	}

	function onConnectSocket(){
		socket.emit('currentStatus');
	}

	function setRemoteBtnClass(btnId, state){
		var el = document.getElementById(btnId);
		switch(state){
			case 'enable':
				el.classList.remove("disabled");
			break;
			case 'disable':
			default:
				el.classList.add("disabled");
			break;
		}
	}

	function setInputAttr(inputId, state){
		if(state === 'disable')
			document.getElementById(inputId).setAttribute('disabled', true);
		else
			document.getElementById(inputId).removeAttribute('disabled');
	}

	function setRemoteBtnState(states){
		setRemoteBtnClass('remote-btn_set',   (!!states[0])?'enable':'disable');
		setRemoteBtnClass('remote-btn_start', (!!states[1])?'enable':'disable');
		setRemoteBtnClass('remote-btn_pause', (!!states[2])?'enable':'disable');
		setRemoteBtnClass('remote-btn_stop',  (!!states[3])?'enable':'disable');

		setInputAttr('remote-time_hour',   !!states[0]?'enable':'disable');
		setInputAttr('remote-time_minute', !!states[0]?'enable':'disable');
		setInputAttr('remote-time_second', !!states[0]?'enable':'disable');
	}

	function isTimeEmpty(data){
		if(!data.timeSet)
			return true;
		return !data.timeSet.hour && !data.timeSet.minute && !data.timeSet.second;
	}

	function setUpDurationTime(data, enableBtn){
		var timeSet = Object.assign({}, data.timeSet);
		document.querySelector(".clock-display .hour")    .innerText = Number(timeSet.hour     || 0)             .toFixed(0).padStart(2,'0');
		document.querySelector(".clock-display .minute")  .innerText = Number(timeSet.minute   || 0)             .toFixed(0).padStart(2,'0');
		document.querySelector(".clock-display .second")  .innerText = Number(timeSet.second   || 0)             .toFixed(0).padStart(2,'0');
		document.querySelector(".clock-display .millisec").innerText = Number(parseInt(timeSet.millisec || 0)/10).toFixed(0).substr(0, 2).padStart(2,'0');

		// start darkmode
		if (timeSet.hour === 0 && timeSet.minute === 8 && timeSet.second === 10) {
			// enableDarkmode();
		}

		if(!!enableBtn){
			setRemoteBtnState([ 1,!isTimeEmpty(data),0,0 ]);
			document.body.classList.remove("timeup");
		}
	}

	function clearTimeRunner(){
		if(!!window.__TIME_RUNNER_INTERVAL__)
			window.clearInterval(window.__TIME_RUNNER_INTERVAL__);
	}

	function pauseTime(data){
		console.log("[pauseTime] data", data);
		clearTimeRunner();
		setUpDurationTime(data);
		
		setRemoteBtnState([ 0,1,0,1 ]);
		document.body.classList.remove("timeup");
	}

	function resetTime(resetTimeUp){
		clearTimeRunner();
		setUpDurationTime({});
		setRemoteBtnState([ 1,0,0,0 ]);
		disableDarkMode();
		if(!!resetTimeUp)
			document.body.classList.remove("timeup");
	}

	function startTime(data){
		clearTimeRunner();
		setUpDurationTime(data);
		// Set finish line
		window.__FINISH_TIME__  = null;
		// We use central time from server first.
		if(typeof data.finishTime === "string" && !!data.finishTime)
			window.__FINISH_TIME__ = new Date(data.finishTime);

		// Just for fallback
		if(!window.__FINISH_TIME__ || isNaN(window.__FINISH_TIME__)){
			window.__FINISH_TIME__ = getCurrentTime();
			window.__FINISH_TIME__.setHours       (window.__FINISH_TIME__.getHours()        + Number(data.timeSet.hour || 0));
			window.__FINISH_TIME__.setMinutes     (window.__FINISH_TIME__.getMinutes()      + Number(data.timeSet.minute || 0));
			window.__FINISH_TIME__.setSeconds     (window.__FINISH_TIME__.getSeconds()      + Number(data.timeSet.second || 0));
			window.__FINISH_TIME__.setMilliseconds(window.__FINISH_TIME__.getMilliseconds() + Number(data.timeSet.millisec || 0));
		}

		window.__TIME_RUNNER_INTERVAL__ = window.setInterval(function(){
			var timeDiffMillisec = window.__FINISH_TIME__ - (getCurrentTime());
			if(timeDiffMillisec > 0){
				setUpDurationTime({
					timeSet: {
						hour:   parseInt((timeDiffMillisec) / ( 1000  * 60    * 60)),
						minute: parseInt((timeDiffMillisec) / ( 1000  * 60 )) % 60,
						second: parseInt( timeDiffMillisec  /   1000) % 60,
						millisec:         timeDiffMillisec  %   1000
					}
				});
			}else{
				document.body.classList.add("timeup");
				resetTime();
			}
		}, 50);

		setRemoteBtnState([ 0,0,1,1 ]);
		document.body.classList.remove("timeup");
	}

	socket.on('onError', function(err) {
		console.error(err)
	});

	socket.on('connect', function() { 
		onConnectSocket();
		console.log('Connected to server.'); 
	});

	socket.on('reconnect', function(){
		onConnectSocket();
		console.log('you have been reconnected');
	});

	socket.on('reconnect_error', function(){
		console.log('attempt to reconnect has failed');
	});

	function onClockStateUpdate(data){
		console.log("[onClockStateUpdate] data", data);
		switch(data.code){
			case '00':
				setUpDurationTime(data, true);
			break;
			case '01':
				startTime(data);
			break;
			case '02':
				pauseTime(data);
			break;
			case '03':
				resetTime(true);
			break;
		}
	}

	function onMessageUpdate(msg){
		if(!!msg && !!msg.length)
			document.getElementById('remote-message_display').innerText = msg;
		document.getElementById('remote-message_display').dispatchEvent(window.__EVENT__FITTEXT__);
	}
	socket.on('currentStatus', function(data){
		onClockStateUpdate(data);
		onMessageUpdate(data.message);
		document.getElementById('remote-displaytext').value = data.message;

		if(!!data.timeSet){
			document.getElementById('remote-time_hour').value   = data.timeSet.hour;
			document.getElementById('remote-time_minute').value = data.timeSet.minute;
			document.getElementById('remote-time_second').value = data.timeSet.second;
		}
		M.updateTextFields();
	});
	socket.on('timer-event', onClockStateUpdate);
	socket.on('message', function(msg){
		onMessageUpdate(msg);
	});
	socket.on('timesync', function (data) {
		//console.log('receive', data);
		ts.receive(null, data);
	});


	function skipToNext(e, elId){
		if(e.key === "Enter" || e.key === "Tab"){
			if(e.key === "Enter"){
				var targetEl = document.getElementById(elId);
				targetEl.focus();
				if(typeof targetEl.select === 'function')
					targetEl.select();
			}
			
			var el = e.target;
			el.value = Number(el.value).toString().padStart(2,'0');
		}
	}

	document.querySelector(".remote-time").addEventListener("focus", function(e){
		e.target.select();
	});
	document.getElementById("remote-time_hour").addEventListener("keydown", function(e){
		skipToNext(e, "remote-time_minute");
	});
	document.getElementById("remote-time_minute").addEventListener("keydown", function(e){
		skipToNext(e, "remote-time_second");
	});
	document.getElementById("remote-time_second").addEventListener("keydown", function(e){
		var btnEl = document.getElementById('remote-btn_set');
		if(e.key === 'Enter' && !btnEl.classList.contains("disabled"))
			btnEl.click();
	});

	function remoteAction(elId, cb){
		document.getElementById(elId).addEventListener('click', function(e){
			if(!e.target.classList.contains("disabled"))
				cb(e);
		});
	}

	remoteAction('remote-btn_set', function(e){
		var txtHours   = document.getElementById('remote-time_hour');
		var txtMinutes = document.getElementById('remote-time_minute');
		var txtSecond  = document.getElementById('remote-time_second');
		var data = {
			code: '00',
			codeDesc:'timeUpdate', 
			timeSet: {
				hour:   parseInt(txtHours.value), 
				minute: parseInt(txtMinutes.value), 
				second: parseInt(txtSecond.value), 
				millisec: 0 
			}
		};
		if(isTimeEmpty(data)){
			alert("Time must not empty");
		}else{
			emitMessage('timer-event', data);
		}
	});

	remoteAction('remote-btn_start', function(e){
		emitMessage('timer-event', { code: '01',codeDesc:'timeStart' });
	});

	remoteAction('remote-btn_pause', function(e){
		emitMessage('timer-event', { code: '02',codeDesc:'timeStop' });
	});

	remoteAction('remote-btn_stop', function(e){
		emitMessage('timer-event', { code: '03',codeDesc:'timeReset' });
	});

	document.getElementById('remote-displaytext').addEventListener('keyup', function(e){
		emitMessage('message', {message: e.target.value});
	});

	document.getElementById('remote-toggle_view').addEventListener('click', function(e){
		if(document.body.classList.contains('mode__editor')){
			document.body.classList.add('mode__viewer');
			document.body.classList.remove('mode__editor');
			onMessageUpdate();
		}else{
			document.body.classList.remove('mode__viewer');
			document.body.classList.add('mode__editor');
		}
	})

	M.AutoInit();

	window.authen = authen;
	window.fitText(document.getElementById('remote-message_display'));
});
