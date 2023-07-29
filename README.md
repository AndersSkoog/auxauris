Old and unfinished project prototype of a "Groovebox"-style webaudio browser application where two people can jam with eachother using websockets mediated through a node/express backend.

Inspired by the https://nanoloop.com/ android app, and works in a similar fashon.
You have a number of tracks, each track has an instrument which is controlled by a stepsequencer that can store different patterns.
There are 4 monophonic instuments to choose from: 
a basic 1-operator Fm synth.
a basic subtractive synth with a unison effect.
a pitch envelope synth that makes kick sounds.
a filtered noise synth for making hihat and snare sounds.
each track also has an effects section with reverb, compressor and feedback delay.

In a jam session, the client application creates a second gui-less instance of the synthengine and sequencer, 
and its audio output is mixed with the output from the synthengine that the user controls.
When a user makes a control change, it will be communicated to the connected client which will control the gui-less instance. 
The application state that determine sound is thus reflected to be the same for both clients, and should sound the same, 
but no audio data needs to be sent over the network.     

In the unlikely scenario where someone would feel inclined to continue working on it, here is a todo list:
* Security
> Not written with any security in mind, make nessessary production configurations before deploying, 
needs validation of input html elements 

* Client performance
> Consider rewriting the synthengine without the Timbre.js library and make use of Audioworklets.

* Session handling:
> Needs a better way of keeping track of connected clients, currently it stores a dictionary in memory in a very awful way,
associated bugs here. Consider implementing the same functionality without the socket.io library, just use the native browser websocket apis.

* Gui:
Some bugs in the UI, written for an old version of React. Associated performance issues by having so many event handlers, 
consider sliming it down, perhaps by making a Html-canvas Gui instead.











