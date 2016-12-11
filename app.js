const express = require('express');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.set('views', path.join(__dirname));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname)));

server.listen(3000,function(){
    console.log("listening on:3000");    
});

app.get('/',function(req,res){
    res.render("index");
});

io.of('/public').publicusers = {};
io.of('/availusers').availusers = {};


io.on('connection',function(socket){
	socket.on('enter',function(_nickname){
		var _users = io.of('/public').publicusers;
		if(_users[socket.id] == null){
			io.of('/availusers').availusers[socket.id] = {nickname:_nickname,id:socket.id};
			io.of('/public').publicusers[socket.id] = {nickname:_nickname,id:socket.id};
			socket.join('/public');
			socket.join('/availusers');
			io.to(socket.id)
			.emit('resp',{respcode:100,msg:"now public as:"+_nickname,data:{id:socket.id,nickname:_nickname,users:io.of('/availusers').availusers}});			
		}
		else{
			io.to(socket.id).emit('resp',{respcode:101,msg:"invalid request"});
		}
		io.to('/public').emit('resp',{respcode:105,data:io.of('/availusers').availusers});
	});
	socket.on('exit',function(session){
		delete io.of('/public').publicusers[socket.id];
		delete io.of('/availusers').availusers[socket.id];
		socket.leave(session);
		socket.leave('/public');
		socket.leave('/availusers');
		socket.emit('resp',{respcode:102,msg:"you are now uncallable"});
		if(session != null){
			socket.broadcast.to(session).emit('peerdisconnected');
		}
		io.to('/public').emit('resp',{respcode:105,data:io.of('/availusers').availusers});

	});
	socket.on('leavesession',function(session){
		socket.leave(session);
		io.of('/availusers').availusers[socket.id] = io.of('/public').publicusers[socket.id];
		io.to('/public').emit('resp',{respcode:105,data:io.of('/availusers').availusers});
	});
	socket.on('establishconnection',function(callrespdata,callersetupdata){
		socket.join(callrespdata.sessionid);
		var datapkg = 
		{
			sessionid:callrespdata.sessionid
		};
		datapkg[callrespdata.callernick] = callrespdata.calleesetup;
		datapkg[callrespdata.calleenick] = callersetupdata;
		io.to(callrespdata.sessionid).emit
		(
			'resp',
			{
				respcode:104,
				msg:"peerconnected!",
				data:datapkg
			}
		);
	});
	socket.on('callrequest',function(id){
		io.to(id).emit('call',io.of('/public').publicusers[socket.id]);
	});
    socket.on('callresponse',function(_callerid,_callernick,_calleenick,_tracksdata){
    	socket.join(_callerid+socket.id);
    	io.to(_callerid).emit
    	(
    		"connectpeer",
    		{
    			sessionid:_callerid+socket.id,
    			callernick:_callernick,
    			calleenick:_calleenick,
    			calleesetup:_tracksdata
    		}
    	);
    	delete io.of('/availusers').availusers[socket.id];
    	delete io.of('/availusers').availusers[_callerid];
    	io.to('/public').emit('resp',{respcode:105,data:io.of('/availusers').availusers});
    });
    socket.on('callreject',function(callerid){
    	io.to(callerid).emit('resp',{respcode:103});
    });
    socket.on('ctrlchange',function(pkg){
    	socket.broadcast.to(pkg.sid).emit(pkg.cid,pkg.data);
    });
    socket.on('playbackstart',function(sid){
    	socket.broadcast.to(sid).emit('playbackstart');
    });
    socket.on('playbackstop',function(sid){
    	socket.broadcast.to(sid).emit('playbackstop');
    });
});





