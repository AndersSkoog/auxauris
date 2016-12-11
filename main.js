import React from 'react';
import ReactDOM from 'react-dom';
import Tone from 'tone';
require('./mathfunctions.js');
function range(s,e){return Array.from({length: Math.abs(s - e) + 1}, (v, k) => k+s);};
const W = window.screen.width;
const H = window.screen.height;
document.querySelector("body").style.fontSize = H * 0.013 + "px";
function getDiffIndex(old,cur){return cur.findIndex((v,i)=> old[i] != v);}
const Notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
const HarmNotes = [...Notes.map((n)=> "-"+n),...Notes,...Notes.map((n)=> "+"+n)];
const Durations = ["L32","L16","L8","L6","L4","L3","L2","L1"];
// const WaveTypes = ["sin","tri","saw","pulse","fami","konami","wavc"];
// const WaveTypesNames = ["sin","tri","saw","pulse","8bit1","8bit2","custom"];
//const PartialLables = ["1","1/2","1/3","1/4","1/5","1/6","1/7","1/8"];
const EfxParamLabels = 
[
    ["room","damp","mix"],
    ["time","fb","mix"],
    ["","",""]
];
const valueformaters = {
    "partial":function(v){return Math.fix(v,0,9,1,0).toString();},
    "lfodur":function(v){return "1/"+["32","16","8","6","4","3","2","1"][Math.fix(v,0,7,1,0)];},
    "lfodiv":function(v){return ["-X8","-X6","-X4","-X2","0","X2","X4","X6","X8"][Math.fix(v,0,8,1,0)];},
    "harm":function(v){return HarmNotes[Math.fix(v,0,35,1,0)];},
    "round":function(v){return v.toFixed(2);}
}

function multiformater(arr,fn){
    return arr.map(function(){return function(v){return fn(v);}});
}
function getTrack(){
    return tracks[selectedtrack];
}
function getVoiceParams(){
    return getTrack().voiceparams;
}
function transpose(freq,interv){return freq * Math.pow(2,interv / 12)}
function getAmpEnvTable(arr){return [0,[1,500 * arr[0]],[0.5,500 * arr[1]],[0,1000 * arr[2]]];};
function getWave(arr){return "wavc("+arr.map((v)=> Math.fix(v,0,9,1,0)).join("")+")";}
function getDur(arr){
    let bpmstr = `BPM${parseInt(timbre.bpm * [0.2,0.4,0.6,0.8,1,2,4,6,8][Math.fix(arr[1],0,7,1,0)])}`;
    return bpmstr+Durations[Math.fix(arr[0],0,7,1.0)];
};
var Slider = function(props){
    function inputhandler(e){
        let target = document.getElementById(props.parentid).querySelector('.sliderframe');
        let rect = target.getBoundingClientRect();
        let rv = mobileDevice ? Math.abs(rect.bottom - e.touches[0].clientY) / rect.height : Math.abs(rect.bottom - e.clientY) / rect.height;
        let nv = Math.roundByDecimal(rv,2);
        if(nv == 0.01){nv = 0;}
        let newval = Math.clamp(nv,0,1);
        target.querySelector(".fill").style.height = 100 * newval + "%";
        target.parentElement.querySelector(".valtext").textContent = props.formater(newval);
        props.setter(newval);        
    }
    function mouseinputHandler(e){
        if(e.buttons == 1){
            let target = document.getElementById(props.parentid).querySelector('.sliderframe');
            let rect = target.getBoundingClientRect();
            let rv = Math.abs(rect.bottom - e.clientY) / rect.height;
            let nv = Math.roundByDecimal(rv,2);
            if(nv == 0.01){nv = 0;}
            let newval = Math.clamp(nv,0,1);
            target.querySelector(".fill").style.height = 100 * newval + "%";
            target.parentElement.querySelector(".valtext").textContent = props.formater(newval);
            //console.log(newval);
            props.setter(newval);
            //props.updater(target,newval);
        }
    }

    let r = 
    <div id={props.parentid}>
        <div style={{width:W * 0.08 + "px",textAlign:"center"}}>{props.label}</div>
        <div style={{width:W * 0.08 + "px", height:H * 0.08 + "px"}} className="sliderframe" name="frame" onMouseMove={mouseinputHandler} onTouchStart={inputhandler} onTouchMove={inputhandler}>
            <div className="fill" style={{height:100 * props.getter() + "%",width:"100%"}}></div>
        </div>
        <div className="valtext" style={{textAlign:"center",width:W * 0.08 + "px"}}>{props.formater(props.getter())}</div>
    </div>
    return r;
}
var MultiSlider = function(props){
    return <div>{
        props.getter().map(function(val,i){
            let r =
            <div key={i} className="inline"><Slider
            label={props.labels[i]}
            parentid={props.parentid+i}
            getter={function(){return props.getter()[i]}}
            setter={function(v){props.setter(v,i)}}
            formater={props.formaters[i]}
            ></Slider></div>;
            return r;
        })
    }</div>
}
var Tab = function(props){
    return <div className="tab">
    {
        props.labels.map(
            function(v,i){
                let cn = "inline col-xs-2 col-sm-2 col-md-2 col-lg-2";
                if(i == props.getter()){
                    cn = cn + " selected";
                }
                let r = <div style={{height:window.screen.height * 0.04 + "px",textAlign:"center",lineHeight:window.screen.height * 0.04 + "px",color:"white",fontSize:H * 0.01 + "px"}} key={i} className={cn} onClick={function(e){props.setter(i);props.updater(e);}}>{v}</div>;
                return r;
            }
        )
    }
    </div>;
}
var Toggle = function(props){
    let cn = props.getter() == true ? "toggle on" : "toggle";
    let l = props.getter() == true ? props.statelabels[1] : props.statelabels[0];
    let r = <div style={{width:props.w + "px",height:props.h + "px"}} className={cn} onClick={function(e){props.setter(e);props.updater();}}>{l}</div>;
    return r;
}
var Step = function(props){
    let _style = {
        width:window.screen.availWidth / 8 + "px",
        height:window.screen.availHeight / 11 + "px",
        lineHeight:window.screen.availHeight / 11 + "px",
        textAlign:"center"
    }
    let clickHandler = function(e){
        if(mobileDevice == false){
            if(e.target.getAttribute('itemprop') == "true"){
                let s = $(e.target).hasClass('active') ? 0 : 1;
                [
                    ()=> {getTrack().toggleStep(props.index,0);$(e.target).removeClass('active');},
                    ()=> {getTrack().toggleStep(props.index,1);$(e.target).addClass('active');}
                ][s]();
            }
        }
        else {
            let s = $(e.target).hasClass('active') ? 0 : 1;
            [
                ()=> {getTrack().toggleStep(props.index,0);$(e.target).removeClass('active');},
                ()=> {getTrack().toggleStep(props.index,1);$(e.target).addClass('active');}
            ][s]();    
        }
    }
    let mouseMovehandler = function(e){
        let index = parseInt(e.target.getAttribute('name'));
        if(e.buttons == 1 && $(e.target).hasClass('active')){
            if(e.nativeEvent.movementY > 0){e.target.textContent = props.decrementor(props.index);}
            else if(e.nativeEvent.movementY < 0){e.target.textContent = props.incrementor(props.index);}
            e.target.setAttribute('itemprop',"false");
        }
        else {e.target.setAttribute('itemprop',"true");}
    }
    let touchmoveHandler = function(e){
        e.preventDefault();
        if($(e.target).hasClass('active')){
            let target = e.target;
            let lypos = parseFloat(e.target.getAttribute("itemprop")) || parseInt(e.target.getAttribute('itemprop'));
            let cypos = e.touches[0].clientY;          
            if(lypos > cypos) {target.textContent = props.incrementor(props.index);}
            else if(lypos < cypos){target.textContent = props.decrementor(props.index);}            
        }
    }
    let cn = "inline step";
    if(props.active){cn = cn + " active"}
    if(props.played){cn = cn + " played"}
    return mobileDevice ? 
    <div 
    style={_style} 
    className={cn} 
    onClick={clickHandler} 
    onTouchStart={
        function(e){
            let v = e.touches[0].clientY;
            e.target.setAttribute("itemprop",v);
        }
    } 
    onTouchMove={touchmoveHandler}>{props.val}
    </div> :
    <div 
    style={_style} 
    className={cn} 
    onClick={clickHandler} 
    onMouseMove={mouseMovehandler}>{props.val}
    </div>;
}
var InputModal = function(props){
    let r = 
    <div className="modal fade" id={props.modalid} tabIndex="-1" role="dialog" style={{color:"black"}}>
        <div className="modal-dialog" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 className="modal-title" id="modaltitle">{props.modaltitle}</h4>
                </div> 
                <div className="modal-body">
                    <form>
                        <div className="form-group form-group-lg">
                            <label htmlFor={props.modalid+"input"} className="control-label">{props.inputlabel}</label>
                            <input type="text" className="form-control" id={props.modalid+"input"} />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-default" data-dismiss="modal" onClick={props.dismisshandler}>{props.dismisslabel}</button>
                    <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={
                        function(){
                            props.submithandler($("#"+props.modalid+"input").val());
                        }
                    }
                    >{props.submitlabel}
                    </button>
                </div>            
            </div>
        </div>
    </div>;
    return r;
}
var ConfirmModal = function(props){
    let r = 
    <div className="modal fade" id={props.modalid} tabIndex="-1" role="dialog" style={{color:"black"}}>
        <div className="modal-dialog" role="document">
            <div className="modal-content">
                <div className="modal-header">
                    <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 className="modal-title" id="modaltitle">{props.modaltitle}</h4>
                </div> 
                <div className="modal-footer">
                    <button type="button" className="btn btn-default" data-dismiss="modal" onClick={props.dismisshandler}>{props.dismisslabel}</button>
                    <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={props.confirmhandler}
                    >{props.confirmlabel}
                    </button>
                </div>            
            </div>
        </div>
    </div>;
    return r;
}

function NumberBox(props){
    let r = 
    <div>
        <div style={{width:props.w+"px",textAlign:"center"}}>{props.label}</div>
        <div className="numberbox" style={{width:props.w + "px",height:props.h + "px",
        lineHeight:props.h + "px", textAlign:"center",fontSize:props.h / 2 + "px"}}
            onMouseMove={
                function(e){
                    if(e.buttons == 1){
                        let mv = e.nativeEvent.movementX;
                        if(mv > 0){
                            let v = props.getter() + (props.step * mv);
                            props.setter(v);
                            e.target.textContent = props.formater(v);
                            return false;
                        } 
                        if(mv < 0){
                            let v = props.getter() - Math.abs(props.step * mv); 
                            props.setter(v);
                            e.target.textContent = props.formater(v);
                            return false;
                        }
                    }
                }
            }
            onTouchStart={
                function(e){
                    let v = e.touches[0].clientY;
                    $(e.nativeEvent.target).attr("itemprop",v);
                }
            }
            onTouchMove={
                function(e){
                    let l = parseFloat(e.target.getAttribute("itemprop")) || parseInt(e.target.getAttribute("itemprop"));
                    let c = e.touches[0].clientY;
                    //let df = parseInt(Math.abs(lx - cx));
                    if(l < c){
                        let v = Math.clamp(props.getter() - props.step,props.min,props.max);
                        props.setter(v);
                        e.target.textContent = props.formater(v);
                        return;
                    }
                    else if(l > c){
                        let v = Math.clamp(props.getter() + props.step,props.min,props.max);
                        props.setter(v);
                        e.target.textContent = props.formater(v);
                        return;
                    }     
                }
            }
        >{props.formater(props.getter())}</div>
    </div>;
    return r;
}

var FmVoice = function(p){
    this.synth = T("SynthDef");   
    this.synth.def = function(opts){
        let carrier,modosc,filter,amp;
        modosc = 
        T
        (
            "osc",
            {
                wave:getWave(opts.shape2),
                freq:T("*",T(opts.modharm),T("osc",{wave:getWave(opts.lfoshape),freq:getDur(opts.lfotime),add:opts.gen[1],mul:p.lfolvls[0]})).kr()
            }
        );
        carrier = T("osc",{wave:getWave(opts.shape1),freq:opts.freq,phase:modosc});
        filter = 
        T
        (
            "lpf",
            {
                cutoff:T("osc",{wave:getWave(opts.lfoshape),freq:getDur(opts.lfotime),add:opts.ctf,mul:(opts.ctf / 2) * opts.lfolvls[1]}).kr(),
                Q:opts.res
            },carrier
        );
        amp = T("env",{table:getAmpEnvTable(opts.ampenv),mul:opts.level},filter);
        return amp.on("ended", opts.doneAction).bang();
    };
    this._fxparams = p.fxparams;
    this._fxtype = p.fxtype;    
    this._effect;
    if(p.fxtype == 0){
        this._effect = T("reverb",{room:p.fxparams[0],damp:p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    if(p.fxtype == 1){
        this._effect = T("delay",{time:Durations[Math.fix(p.fxparams[0],0,7,1,0)],fb:0.9 * p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    this.trig = function(note,trackparams,stepvals){      
        if(this._effect != null){
            this._effect.nodes[0] =
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    shape1:trackparams.shape1,
                    shape2:trackparams.shape2,
                    modharm:Tone.Frequency(note,'midi').transpose(range(-12,24)[Math.fix(trackparams.gen[0],0,35,1,0)]).eval(),
                    gen:trackparams.gen,
                    lfoshape:trackparams.lfoshape,
                    lfotime:trackparams.lfotime,
                    lfolvls:trackparams.lfolvls,
                    level:trackparams.level,
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
        else {
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    shape1:trackparams.shape1,
                    shape2:trackparams.shape2,
                    modharm:Tone.Frequency(note,'midi').transpose(range(-12,24)[Math.fix(trackparams.gen[0],0,35,1,0)]).eval(),
                    gen:trackparams.gen,
                    lfoshape:trackparams.lfoshape,
                    lfotime:trackparams.lfotime,
                    lfolvls:trackparams.lfolvls,
                    level:trackparams.level,
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
    }    
}
FmVoice.prototype = {
    set fxparams(arr){
        this._fxparams = arr;
        if(this._fxtype == 0){
            this._effect.set({
                room:arr[0],
                damp:arr[1],
                mix:arr[2]
            });    
        }
        if(this._fxtype == 1){
            this._effect.set({
                time:Durations[Math.fix(arr[0],0,7,1,0)],
                fb:0.9 * arr[1],
                mix:arr[2]
            });
        }
    },
    set fxtype(index){
        if(index != this._fxtype){
            let p = this._fxparams;
            if(this._effect != null){
                this._effect.removeAll();
                this._effect = null;        
            }
            if(index == 0){
                this._effect = T("reverb",{room:p[0],damp:p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;  
            }
            if(index == 1){
                this._effect = T("delay",{time:Durations[Math.fix(p[0],0,7,1,0)],fb:0.9 * p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;
            }            
        }
    }
}

var FatVoice = function(p){
    this.synth = T("SynthDef");   
    this.synth.def = function(opts){
        let osc,filter,amp
        osc = T("cosc",{wave:"saw("+parseInt(100 * opts.gen[0])+")",beats:5 * opts.gen[1],freq:opts.freq});
        filter = 
        T
        (
            "lpf",
            {
                cutoff:T("osc",{wave:getWave(opts.lfoshape),freq:getDur(opts.lfotime),add:opts.ctf,mul:(opts.ctf / 2) * opts.lfolvl}).kr(),
                Q:opts.res
            },osc
        );
        amp = T("env",{table:getAmpEnvTable(opts.ampenv),mul:opts.level},filter);
        return amp.on("ended", opts.doneAction).bang();
    };
    this._fxparams = p.fxparams;
    this._fxtype = p.fxtype;    
    this._effect;
    if(p.fxtype == 0){
        this._effect = T("reverb",{room:p.fxparams[0],damp:p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    if(p.fxtype == 1){
        this._effect = T("delay",{time:Durations[Math.fix(p.fxparams[0],0,7,1,0)],fb:0.9 * p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }  
    this.trig = function(note,trackparams,stepvals){       
        if(this._effect != null){
            this._effect.nodes[0] =
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    gen:trackparams.gen,
                    lfoshape:trackparams.lfoshape,
                    lfotime:trackparams.lfotime,
                    lfolvl:trackparams.lfolvls[1],
                    level:trackparams.level,
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
        else {
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    gen:trackparams.gen,
                    lfoshape:trackparams.lfoshape,
                    lfotime:trackparams.lfotime,
                    lfolvl:trackparams.lfolvls[1],
                    level:trackparams.level,
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
    }
}
FatVoice.prototype = {
    set fxparams(arr){
        this._fxparams = arr;
        if(this._fxtype == 0){
            this._effect.set({
                room:arr[0],
                damp:arr[1],
                mix:arr[2]
            });    
        }
        if(this._fxtype == 1){
            this._effect.set({
                time:Durations[Math.fix(arr[0],0,7,1,0)],
                fb:0.9 * arr[1],
                mix:arr[2]
            });
        }
    },
    set fxtype(index){
        if(index != this._fxtype){
            let p = this._fxparams;
            if(this._effect != null){
                this._effect.removeAll();
                this._effect = null;        
            }
            if(index == 0){
                this._effect = T("reverb",{room:p[0],damp:p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;  
            }
            if(index == 1){
                this._effect = T("delay",{time:Durations[Math.fix(p[0],0,7,1,0)],fb:0.9 * p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;
            }            
        }
    }
}

var KickVoice = function(p){
    this.synth = T("SynthDef");   
    this.synth.def = function(opts){
        let osc,penv,eq,comp,amp;
        penv = T
        (
            "env",
            {
                table:
                [
                    opts.freq + (500 * opts.gen[0]),
                    [
                        Tone.Frequency(opts.freq).transpose(-12 * opts.gen[0]).eval(),
                        500 * opts.gen[1] 
                    ],
                    [
                        Tone.Frequency(opts.freq).transpose(-12 * opts.gen[0]).eval(),
                        1000 * opts.ampenv[2]   
                    ]
                ]
            }
        ).bang();    
        //a:0,r:500 * opts.gen[1],s:Tone.Frequency(opts.freq).transpose(-12 * Math.fix(opts.gen[0],1,4,1,0)).eval() + (200 * opts.gen[0])}).bang();
        osc = T("osc",{wave:getWave(opts.shape1),freq:penv});
        eq = T("eq",{
            params:{hpf:[1000 - (980 * opts.eq[0]),2,-10],mf:[500,0.1,-19 + (19 * opts.eq[1])],lpf:[2000 + (3000 * opts.eq[2]),2,-10]}
        },osc);
        comp = T("comp",{thresh:(0 + (-100) * opts.comp[0]),knee:40 * p.comp[1],ratio:1 + (20 * opts.comp[2]),gain:8 * opts.comp[3]},eq);         
        amp = T("env",{table:getAmpEnvTable(opts.ampenv),mul:opts.level},comp);
        return amp.on("ended", opts.doneAction).bang();
    };
    this._fxparams = p.fxparams;
    this._fxtype = p.fxtype;    
    this._effect;
    if(p.fxtype == 0){
        this._effect = T("reverb",{room:p.fxparams[0],damp:p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    if(p.fxtype == 1){
        this._effect = T("delay",{time:Durations[Math.fix(p.fxparams[0],0,7,1,0)],fb:0.9 * p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }     
    this.trig = function(note,trackparams,stepvals){       
        if(this._effect != null){
            this._effect.nodes[0] =
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    shape1:trackparams.shape1,
                    gen:trackparams.gen,
                    eq:trackparams.eq,
                    comp:trackparams.comp,
                    level:trackparams.level
                }
            );
        }
        else {
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    shape1:trackparams.shape1,
                    gen:trackparams.gen,
                    eq:trackparams.eq,
                    comp:trackparams.comp,
                    level:trackparams.level
                }
            );
        }
    }
}
KickVoice.prototype = {
    set fxparams(arr){
        this._fxparams = arr;
        if(this._fxtype == 0){
            this._effect.set({
                room:arr[0],
                damp:arr[1],
                mix:arr[2]
            });    
        }
        if(this._fxtype == 1){
            this._effect.set({
                time:Durations[Math.fix(arr[0],0,7,1,0)],
                fb:0.9 * arr[1],
                mix:arr[2]
            });
        }
    },
    set fxtype(index){
        if(index != this._fxtype){
            let p = this._fxparams;
            if(this._effect != null){
                this._effect.removeAll();
                this._effect = null;        
            }
            if(index == 0){
                this._effect = T("reverb",{room:p[0],damp:p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;  
            }
            if(index == 1){
                this._effect = T("delay",{time:Durations[Math.fix(p[0],0,7,1,0)],fb:0.9 * p[1],mix:p[2]},T(0)).play();
                this._fxtype = index;
            }            
        }
    }     
}
var NoiseVoice = function(p){
    this.synth = T("SynthDef");   
    this.synth.def = function(opts){
        let osc,fenv,filter,eq,comp,amp;
        fenv = 
        T(
            "env",
            {
                table:
                [
                    50,
                    [
                        opts.ctf,
                        500 * opts.filter[2]
                    ],
                    [
                        50 + (opts.ctf - (opts.ctf * opts.filter[4])),
                        500 * opts.filter[3]
                    ]
                ]
            }
        ).bang();
        osc = T("fnoise",{freq:15000 * opts.gen[0]});
        filter = T("lpf",{cutoff:fenv,Q:opts.res},osc);
        eq = T("eq",{
            params:{hpf:[1000 - (980 * opts.eq[0]),2,-10],mf:[500,0.1,-19 + (19 * opts.eq[1])],lpf:[2000 + (3000 * opts.eq[2]),2,-10]}
        },filter);
        comp = T("comp",{thresh:(0 + (-100) * opts.comp[0]),knee:40 * p.comp[1],ratio:1 + (20 * opts.comp[2]),gain:8 * opts.comp[3]},eq);         
        amp = T("env",{table:getAmpEnvTable(opts.ampenv),mul:opts.level},comp);
        return amp.on("ended", opts.doneAction).bang();
    };
    this._fxparams = p.fxparams;
    this._fxtype = p.fxtype;    
    this._effect;
    if(p.fxtype == 0){
        this._effect = T("reverb",{room:p.fxparams[0],damp:p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    if(p.fxtype == 1){
        this._effect = T("delay",{time:Durations[Math.fix(p.fxparams[0],0,7,1,0)],fb:0.9 * p.fxparams[1],mix:p.fxparams[2]},T(0)).play();
    }
    this.trig = function(note,trackparams,stepvals){       
        if(this._effect != null){
            this._effect.nodes[0] =
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    gen:trackparams.gen,
                    filter:trackparams.filter,
                    level:trackparams.level,
                    eq:trackparams.eq,
                    comp:trackparams.comp,                  
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
        else {
            this.synth.noteOn(
                note,
                100,
                {
                    ampenv:
                    [
                        Math.clamp(trackparams.ampenv[0] + stepvals[0],0,1),
                        trackparams.ampenv[1],
                        Math.clamp(trackparams.ampenv[2] + stepvals[1],0,1)
                    ],
                    gen:trackparams.gen,
                    filter:trackparams.filter,
                    level:trackparams.level,
                    eq:trackparams.eq,
                    comp:trackparams.comp,                    
                    ctf:20000 * (Math.clamp((trackparams.filter[0] + stepvals[2]),0,1)),
                    res:10 * trackparams.filter[1]
                }
            );
        }
    }             
}
NoiseVoice.prototype = {
    set fxparams(arr){
        this._fxparams = arr;
        if(this._fxtype == 0){
            this._effect.set({
                room:arr[0],
                damp:arr[1],
                mix:arr[2]
            });    
        }
        else if(this._fxtype == 1){
            this._effect.set({
                time:Durations[Math.fix(arr[0],0,7,1,0)],
                fb:0.9 * arr[1],
                mix:arr[2]
            });
        }
    },
    set fxtype(index){
        if(index != this._fxtype){
            let p = this._fxparams;
            if(this._effect != null){
                this._effect.removeAll();
                this._effect = null;        
            }
            if(index == 0){
                this._effect = T("reverb",{room:p[0],damp:p[1],mix:p[2]},T(0)).play();
            }
            else if(index == 1){
                this._effect = T("delay",{time:Durations[Math.fix(p[0],0,7,1,0)],fb:0.9 * p[1],mix:p[2]},T(0)).play();
            }
            this._fxtype = index;        
        }
    }  
}

function voiceInit(params,type){
    let f = 
    [
        ()=> {return new FmVoice(params)},
        ()=> {return new FatVoice(params)},
        ()=> {return new KickVoice(params)},
        ()=> {return new NoiseVoice(params)}
    ][type];
    return f();
}

function emitCtrlChange(prefix,ti,_data){
    socket.emit("ctrlchange",{
        sid:session,
        cid:prefix+ti,
        data:_data
    });
}


var Track = function(ti){
    this.trackindex = ti;
    this.voicetype = 0;
    this.selectedpattern = 0;
    this.selectedpatternparam = 0;
    this.voiceparams = {
        fxtype:2,
        fxparams:[0.5,0.5,0.5],
        level:0.5,
        shape1:[1,0,0,0,0,0,0,0],
        shape2:[1,0,0,0,0,0,0,0],
        lfoshape:[1,0,0,0,0,0,0,0],
        lfotime:[0.5,0.5],
        lfolvls:[0,0],
        ampenv:[0,0.2,0.5],
        comp:[0.5,0.5,0.5,0.5],
        eq:[0.5,0.5,0.5],
        filter:[0.5,0,0,0.5,1],
        gen:[0.5,0.5]
    };
    this.voice = new FmVoice(this.voiceparams);
    //this.voice2 = new FmVoice(this.voiceparams); 
    this.patterns = range(0,3).map((_)=> {
        return {
            len:16,
            oct:3,
            div:"L16",
            np:range(0,47).map((_)=> 48),
            gp:range(0,47).map((_)=> 0),
            atkp:range(0,47).map((_)=> 0),
            decp:range(0,47).map((_)=> 0),
            ctfp:range(0,47).map((_)=> 0)
        }
    });
    this.getpattern = function(){return this.patterns[this.selectedpattern]};
    this.currentstep = 0;
    this.steptrigger = T(function(count){
        if(isPeerConnected && isPeerPlaying){remotetracks[this.trackindex].steptrigger(count);}
        let p = this.getpattern();
        this.currentstep = count % (p.len);
        if(p.gp[this.currentstep] == 1){
            let si = this.currentstep;
            this.voice.trig(p.np[si],this.voiceparams,[p.atkp[si],p.decp[si],p.ctfp[si]]);
        }
        if(selectedpage == 0 && selectedtrack == this.trackindex){
            PatternSteps2();
        }            
    }.bind(this));
    this.incNote = function(stepindex){
        let p = this.getpattern();
        let newnote = p.np[stepindex] + 1;
        if(newnote <= 96){
            p.np[stepindex] = newnote;
            if(isPeerConnected){emitCtrlChange("stepnote",this.trackindex,[this.selectedpattern,stepindex,newnote]);}
        }
        return Tone.Frequency(p.np[stepindex],'midi').toNote();
    }
    this.decNote = function(stepindex){
        let p = this.getpattern();
        let newnote = p.np[stepindex] - 1;
        if(newnote >= 12){
            p.np[stepindex] = newnote;
            if(isPeerConnected){emitCtrlChange("stepnote",this.trackindex,[this.selectedpattern,stepindex,newnote]);}
        }
        return Tone.Frequency(p.np[stepindex],'midi').toNote();
    }
    this.toggleStep = function(stepindex,state){
        let p = this.getpattern();
        p.gp[stepindex] = state;
        if(isPeerConnected){emitCtrlChange("stepgate",this.trackindex,[this.selectedpattern,stepindex,state]);}
    }
    this.setpatternlength = function(Int){
        this.getpattern().len = Int;
        if(isPeerConnected){emitCtrlChange("patternlength",this.trackindex,[this.selectedpattern,Int]);}    
    };
    this.setvoicetype = function(index){
        if(this.voicetype != index){
            this.voice = voiceInit(this.voiceparams,index);
            this.voice.synth.play();
            this.voicetype = index;
            if(isPeerConnected){emitCtrlChange("voicetype",this.trackindex,index);}  
        }
    };
    this.selectpattern = function(index){
        if(this.selectedpattern != index){
            this.selectedpattern = index;
            if(isPeerConnected){emitCtrlChange("selectedpattern",this.trackindex,index);}  
        }
    };
    this.setoutputlevel = function(normal){
        this.voice._amp.mul = normal;
        this.voiceparams.level = normal;
        if(isPeerConnected){emitCtrlChange("level",this.trackindex,normal);} 
    }
}

var RemoteTrack = function(data,ti){
    this.trackindex = ti;
    this.voicetype = data.voicetype;
    this.selectedpattern = data.selectedpattern;
    this.voiceparams = data.voiceparams;
    this.patterns = data.patterns;
    this.voice = voiceInit(data.voiceparams,data.voicetype);
    this.voice.synth.play();
    socket.on("voicetype"+this.trackindex,function(index){
        this.voice = voiceInit(this.voiceparams,index);
        this.voice.synth.play();
        this.voicetype = index;
    }.bind(this));
    socket.on("stepnote"+this.trackindex,function(data){
        this.patterns[data[0]].np[data[1]] = data[2];
    }.bind(this));
    socket.on("stepgate"+this.trackindex,function(data){
        this.patterns[data[0]].gp[data[1]] = data[2];
    }.bind(this));
    socket.on("stepatk"+this.trackindex,function(data){
        this.patterns[data[0]].atkp[data[1]] = data[2];
    }.bind(this));
    socket.on("stepdec"+this.trackindex,function(data){
        this.patterns[data[0]].decp[data[1]] = data[2];
    }.bind(this));
    socket.on("stepctf"+this.trackindex,function(data){
        this.patterns[data[0]].ctfp[data[1]] = data[2];
    }.bind(this));        
    socket.on("patternlength"+this.trackindex,function(data){
        this.patterns[data[0]].len = data[1];
    }.bind(this));
    socket.on("selectedpattern"+this.trackindex,function(index){
        this.selectedpattern = index;
    }.bind(this));
    Object.keys(this.voiceparams).forEach((k)=> {
        if(k == "fxparams"){
            socket.on("fxparams"+this.trackindex,function(data){
                this.voiceparams.fxparams = data;
                this.voice.fxparams = data;
            }.bind(this));    
        }
        if(k == "fxtype"){
            socket.on("fxtype"+this.trackindex,function(index){
                this.voiceparams.fxtype = index;
                this.voice.fxtype = index;
            }.bind(this));
        }
        else{
            socket.on(k+this.trackindex,function(data){
                this.voiceparams[k] = data;
            }.bind(this));
        }
    }); 
    this.getpattern = function(){
        return this.patterns[this.selectedpattern]; 
    }
    this.currentstep = 0;
    this.steptrigger = function(c){
        let p = this.getpattern();
        this.currentstep = c % p.len;
        if(p.gp[this.currentstep] == 1){
            let si = this.currentstep;
            this.voice.trig(p.np[si],this.voiceparams,[p.atkp[si],p.decp[si],p.ctfp[si]]);
        }        
    }
    console.log(this.voiceparams);
    //console.log(data);
}

var tracks = [new Track(0),new Track(1),new Track(2),new Track(3)];
var remotetracks;
timbre.bpm = 120;
var isPeerConnected = false;
var isPublic = false;
var isPlaying = false;
var isPeerPlaying = false; 
var mobileDevice = false;
var nickname;
var session;
var users;
var selectedtrack = 0;
var selectedpage = 0;
var socket = io();
var metro = T("interval", {interval:"L16"},tracks[0].steptrigger,tracks[1].steptrigger,tracks[2].steptrigger,tracks[3].steptrigger);
var peerlvl = 0.5;
if (/Mobi/.test(navigator.userAgent)) {
    mobileDevice = true;
}
function Vc1(){
    let el = document.getElementById("vc1");
    if(selectedpage == 1){
        let vt = getTrack().voicetype;
        if(vt == 0 || vt == 2){
            let header = vt == 0 ? "carrier-partials" : "partials";
            let r =
            <div>
                <div>{header}</div>  
                <MultiSlider
                parentid="shape1"
                labels={["","","","","","","",""]} 
                getter={function(){return getVoiceParams().shape1;}} 
                setter={
                    function(v,index){
                        getVoiceParams().shape1[index] = v;
                        if(isPeerConnected){emitCtrlChange("shape1",selectedtrack,getVoiceParams().shape1)}
                    }
                }
                formaters={multiformater(getVoiceParams().shape1,function(v){return Math.fix(v,0,9,1,0).toString();})}
                >
                </MultiSlider>
            </div>;
            ReactDOM.render(r,el);
        }
        else{
            ReactDOM.render(<span></span>,document.getElementById("vc1"));
        }  
    }
    else{
        ReactDOM.render(<span></span>,document.getElementById("vc1"));
    }
}
function Vc2(){
    let el = document.getElementById("vc2");
    if(selectedpage == 1){
        let vt = getTrack().voicetype;
        if(vt == 0){
            let r =
            <div>
                <div>mod-partials</div> 
                <MultiSlider
                parentid="shape2"
                labels={["","","","","","","",""]} 
                getter={function(){return getVoiceParams().shape2;}} 
                setter={
                    function(v,index){
                        getVoiceParams().shape2[index] = v;
                        if(isPeerConnected){emitCtrlChange("shape2",selectedtrack,getVoiceParams().shape2)}
                    }
                }
                formaters={multiformater(getVoiceParams().shape2,function(v){return Math.fix(v,0,9,1,0).toString();})}
                >
                </MultiSlider>
            </div>;
            ReactDOM.render(r,el);    
        }
        else{ReactDOM.render(<span></span>,el);}
    }
    else{ReactDOM.render(<span></span>,el);}
}
function Vc3(){
    let el = document.getElementById('vc3');  
    let r = selectedpage == 1 ?
    <div>
        <div>amp</div>
        <MultiSlider
        parentid="ampenv"
        labels={["atk","dec","rel"]} 
        getter={function(){return getVoiceParams().ampenv}} 
        setter={
            function(v,index){
                getVoiceParams().ampenv[index] = v;
                if(isPeerConnected){emitCtrlChange("ampenv",selectedtrack,getVoiceParams().ampenv)}
            }
        }
        formaters={multiformater(getVoiceParams().ampenv,function(v){return v.toFixed(2);})}
        >
        </MultiSlider>
    </div> : <span></span>;
    ReactDOM.render(r,el);  
}
function Vc4(){
    let el = document.getElementById("vc4");
    let vt = getTrack().voicetype;
    if(selectedpage == 1 && vt != 2){
        if([0,1].includes(vt)){
            let r = 
            <div>
                <div>filter</div>
                <MultiSlider
                labels={["ctf","res"]}
                parentid="filter"
                getter={function(){let vals = getVoiceParams().filter; return [vals[0],vals[1]];}}
                setter={
                    function(v,index){
                        getVoiceParams().filter[index] = v;
                        if(isPeerConnected){emitCtrlChange("filter",selectedtrack,getVoiceParams().filter)}                   
                    }
                }
                formaters={[function(v){return v.toFixed(2)},function(v){return v.toFixed(2);}]}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el);  
        }
        else{
            let r = 
            <div>
                <div>filter</div>
                <MultiSlider
                parentid="filter"
                labels={["ctf","res","atk","dec","envamt"]}
                getter={function(){return getVoiceParams().filter;}}
                setter={
                    function(v,index){
                        getVoiceParams().filter[index] = v;
                        if(isPeerConnected){emitCtrlChange("filter",selectedtrack,getVoiceParams().filter)}                      
                    }
                }
                formaters={multiformater(getVoiceParams().filter,function(v){return v.toFixed(2);})}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el);               
        }
    }
    else{
        ReactDOM.render(<span></span>,el);
    }     
}
function Vc5(){
    let el = document.getElementById("vc5");
    let vt = getTrack().voicetype;
    let _labels = 
    [
        ["harm","ratio"],
        ["shape","phmod"],
        ["range","dur"],
        ["basefrq"]
    ][vt];
    let _formaters = 
    [
        [valueformaters["harm"],valueformaters["round"]],
        [valueformaters["round"],valueformaters["round"]],
        [valueformaters["round"],valueformaters["round"]],
        [valueformaters["round"]]
    ][vt];
    let r = selectedpage == 1 ?
    <div>
        <div>gen</div>
        <MultiSlider
        labels={_labels}
        parentid="gen"
        getter={function(){return getTrack().voicetype != 3 ? getVoiceParams().gen : [getVoiceParams().gen[0]];}}
        setter={
            function(v,i){
                getVoiceParams().gen[i] = v;
                if(isPeerConnected){emitCtrlChange("gen",selectedtrack,getVoiceParams().gen)}   
            }
        }
        formaters={_formaters}
        >
        </MultiSlider> 
    </div> : <span></span>;
    ReactDOM.render(r,el);  
}
function Vc6(){
    let vt = getTrack().voicetype;
    let el = document.getElementById("vc6");
    if(selectedpage == 1){
        if([0,1].includes(vt)){
            let r = 
            <div>
                <div>lforate</div>
                <MultiSlider
                parentid="lfotime"
                labels={["beat","subdiv"]}
                getter={function(){return getVoiceParams().lfotime;}}
                setter={
                    function(v,i){
                        getVoiceParams().lfotime[i] = v;
                        if(isPeerConnected){emitCtrlChange("lfotime",selectedtrack,getVoiceParams().lfotime);}    
                    }
                }
                formaters={[valueformaters["lfodur"],valueformaters["lfodiv"]]}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el);       
        }
        else if([2,3].includes(vt)){
            let r = 
            <div>
                <div>eq</div>
                <MultiSlider
                parentid="eq"
                labels={["low","mid","high"]}
                getter={function(){return getVoiceParams().eq;}}
                setter={
                    function(v,i){
                        getVoiceParams().eq[i] = v;
                        if(isPeerConnected){emitCtrlChange("eq",selectedtrack,getVoiceParams().eq);} 
                    }
                }
                formaters={[function(v){return v.toFixed(2)},function(v){return v.toFixed(2);},function(v){return v.toFixed(2);}]}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el); 
        }
    }
    else{ReactDOM.render(<span></span>,el)};
}
function Vc7(){
    let vt = getTrack().voicetype;
    let el = document.getElementById("vc7");
    if(selectedpage == 1){
        if([0,1].includes(vt)){
            let _labels = vt == 0 ? ["gen","ctf"] : ["ctf"];
            let _formaters = vt == 0 ? [valueformaters["round"],valueformaters["round"]] : [valueformaters["round"]];
            let r = 
            <div>
                <div>lfo dest</div>
                <MultiSlider
                parentid="lfolvls"
                labels={_labels}
                getter={function(){return vt == 0 ? getVoiceParams().lfolvls : [getVoiceParams().lfolvls[1]]}}
                setter={
                    function(v,i){
                        let ind = getTrack().voicetype == 0 ? i : 1;
                        getVoiceParams().lfolvls[ind] = v;
                        if(isPeerConnected){emitCtrlChange("lfolvls",selectedtrack,getVoiceParams().lfolvls);}  
                    }
                }
                formaters={_formaters}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el);       
        }
        if([2,3].includes(vt)){
            let r = 
            <div>
                <div>comp</div>
                <MultiSlider
                parentid="comp"
                labels={["thresh","knee","ratio","gain"]}
                getter={function(){return getVoiceParams().comp;}}
                setter={
                    function(v,i){
                        getVoiceParams().comp[i] = v;
                        if(isPeerConnected){emitCtrlChange("comp",selectedtrack,getVoiceParams().comp);}  
                    }
                }
                formaters={[
                    function(v){return v.toFixed(2);},
                    function(v){return v.toFixed(2);},
                    function(v){return v.toFixed(2);},
                    function(v){return v.toFixed(2);}
                    ]}
                >
                </MultiSlider> 
            </div>;
            ReactDOM.render(r,el); 
        }
    }
    else{
        ReactDOM.render(<span></span>,el);    
    }
}
function Vc8(){
    let vt = getTrack().voicetype;
    let el = document.getElementById("vc8");
    if(vt < 2 && selectedpage == 1){
        let r = 
        <div>
            <div>lfoshape</div>
            <MultiSlider
            parentid="lfoshape"
            labels={[" "," "," "," "," "," "," "," "]}
            getter={function(){return getVoiceParams().lfoshape;}}
            setter={
                function(v,i){
                    getVoiceParams().lfoshape[i] = v;
                    if(isPeerConnected){emitCtrlChange("lfoshape",selectedtrack,getVoiceParams().lfoshape);}   
                }
            }
            formaters={multiformater(getVoiceParams().lfoshape,function(v){return Math.fix(v,0,9,1,0).toString();})}
            >
            </MultiSlider> 
        </div>;
        ReactDOM.render(r,el);       
    }
    else {
        ReactDOM.render(<span></span>,el);
    }
}
function EffectControls0(){
    let parent = document.getElementById("efxctrls0");
    if(selectedpage == 2){
        let _formaters = tracks[0].voiceparams.fxtype == 1 ? [valueformaters["lfodur"],valueformaters["round"],valueformaters["round"]] : [valueformaters["round"],valueformaters["round"],valueformaters["round"]];
        let r = 
        <div style={{width:W * 0.3 + "px", height:H * 0.15 + "px",display:"table-cell"}}>
            <div>Track1FX</div>
            <Tab
                labels={["reverb","delay","bypass"]}
                getter={function(){return tracks[0].voiceparams.fxtype;}}
                setter={
                    function(ind){
                        tracks[0].voice.fxtype = ind;
                        tracks[0].voiceparams.fxtype = ind;
                        if(isPeerConnected){emitCtrlChange("fxtype",0,ind);} 
                    }
                }
                updater={function(){EffectControls0();}}
            ></Tab>
            {
                tracks[0].voiceparams.fxtype != 2 ?
                <MultiSlider
                labels={EfxParamLabels[tracks[0].voiceparams.fxtype]}
                parentid="fx0"
                getter={function(){return tracks[0].voiceparams.fxparams}}
                setter={
                    function(v,i){
                        tracks[0].voiceparams.fxparams[i] = v;
                        tracks[0].voice.fxparams = tracks[0].voiceparams.fxparams;
                        if(isPeerConnected){emitCtrlChange("fxparams",0,tracks[0].voiceparams.fxparams);} 
                    }
                }
                formaters={_formaters}
                ></MultiSlider>
                :
                <div style={{height:(1 + (H * 0.013) * 3) + (H * 0.08) + "px"}}></div>
            }        
        </div>;
        ReactDOM.render(r,parent);
    }
    else{
        ReactDOM.render(<span></span>,parent);
    }
}
function EffectControls1(){
    let parent = document.getElementById("efxctrls1");
    if(selectedpage == 2){
        let _formaters = tracks[1].voiceparams.fxtype == 1 ? [valueformaters["lfodur"],valueformaters["round"],valueformaters["round"]] : [valueformaters["round"],valueformaters["round"],valueformaters["round"]];
        let r = 
        <div style={{width:W * 0.3 + "px", height:H * 0.15 + "px",display:"table-cell"}}>
            <div>Track2FX</div>
            <Tab
                labels={["reverb","delay","bypass"]}
                getter={function(){return tracks[1].voiceparams.fxtype;}}
                setter={
                    function(ind){
                        tracks[1].voice.fxtype = ind;
                        tracks[1].voiceparams.fxtype = ind;
                        if(isPeerConnected){emitCtrlChange("fxtype",1,ind);} 
                    }
                }
                updater={function(){EffectControls1();}}
            ></Tab>
            {
                tracks[1].voiceparams.fxtype != 2 ?
                <MultiSlider
                labels={EfxParamLabels[tracks[1].voiceparams.fxtype]}
                parentid="fx1"
                getter={function(){return tracks[1].voiceparams.fxparams}}
                setter={
                    function(v,i){
                        tracks[1].voiceparams.fxparams[i] = v;
                        tracks[1].voice.fxparams = tracks[1].voiceparams.fxparams;
                        if(isPeerConnected){emitCtrlChange("fxparams",1,tracks[1].voiceparams.fxparams);} 
                    }
                }
                formaters={_formaters}
                ></MultiSlider>
                :
                <div style={{height:(1 + (H * 0.013) * 3) + (H * 0.08) + "px"}}></div>
            }        
        </div>;
        ReactDOM.render(r,parent);
    }
    else{
        ReactDOM.render(<span></span>,parent);
    }
}
function EffectControls2(){
    let parent = document.getElementById("efxctrls2");
    if(selectedpage == 2){
        let _formaters = tracks[2].voiceparams.fxtype == 1 ? [valueformaters["lfodur"],valueformaters["round"],valueformaters["round"]] : [valueformaters["round"],valueformaters["round"],valueformaters["round"]];
        let r = 
        <div style={{width:W * 0.3 + "px", height:H * 0.15 + "px",display:"table-cell"}}>
            <div>Track3FX</div>
            <Tab
                labels={["reverb","delay","bypass"]}
                getter={function(){return tracks[2].voiceparams.fxtype;}}
                setter={
                    function(ind){
                        tracks[2].voice.fxtype = ind;
                        tracks[2].voiceparams.fxtype = ind;
                        if(isPeerConnected){emitCtrlChange("fxtype",2,ind);} 
                    }
                }
                updater={function(){EffectControls2();}}
            ></Tab>
            {
                tracks[2].voiceparams.fxtype != 2 ?
                <MultiSlider
                labels={EfxParamLabels[tracks[2].voiceparams.fxtype]}
                parentid="fx2"
                getter={function(){return tracks[2].voiceparams.fxparams}}
                setter={
                    function(v,i){
                        tracks[2].voiceparams.fxparams[i] = v;
                        tracks[2].voice.fxparams = tracks[2].voiceparams.fxparams;
                        if(isPeerConnected){emitCtrlChange("fxparams",2,tracks[2].voiceparams.fxparams);}
                    }
                }
                formaters={_formaters}
                ></MultiSlider>
                :
                <div style={{height:(1 + (H * 0.013) * 2) + (H * 0.08) + "px"}}></div>
            }        
        </div>;
        ReactDOM.render(r,parent);
    }
    else{
        ReactDOM.render(<span></span>,parent);
    }
}
function EffectControls3(){
    let parent = document.getElementById("efxctrls3");
    if(selectedpage == 2){
        let _formaters = tracks[3].voiceparams.fxtype == 1 ? [valueformaters["lfodur"],valueformaters["round"],valueformaters["round"]] : [valueformaters["round"],valueformaters["round"],valueformaters["round"]];
        let r = 
        <div style={{width:W * 0.3 + "px", height:H * 0.15 + "px",display:"table-cell"}}>
            <div>Track4FX</div>
            <Tab
                labels={["reverb","delay","bypass"]}
                getter={function(){return tracks[3].voiceparams.fxtype;}}
                setter={
                    function(ind){
                        tracks[3].voice.fxtype = ind;
                        tracks[3].voiceparams.fxtype = ind;
                        if(isPeerConnected){emitCtrlChange("fxtype",3,ind);} 
                    }
                }
                updater={function(){EffectControls3();}}
            ></Tab>
            {
                tracks[3].voiceparams.fxtype != 2 ?
                <MultiSlider
                labels={EfxParamLabels[tracks[3].voiceparams.fxtype]}
                parentid="fx3"
                getter={function(){return tracks[3].voiceparams.fxparams}}
                setter={
                    function(v,i){
                        tracks[3].voiceparams.fxparams[i] = v;
                        tracks[3].voice.fxparams = tracks[3].voiceparams.fxparams;
                        if(isPeerConnected){emitCtrlChange("fxparams",3,tracks[3].voiceparams.fxparams);}
                    }
                }
                formaters={_formaters}
                ></MultiSlider>
                :
                <div style={{height:(1 + (H * 0.013) * 2) + (H * 0.08) + "px"}}></div>
            }        
        </div>;
        ReactDOM.render(r,parent);
    }
    else{
        ReactDOM.render(<span></span>,parent);
    }
}
function MixerControls(){
    const el = selectedpage == 2 ?
    <div>
        <div>levels</div>
        <MultiSlider labels={["Track1","Track2","Track3","Track4","Peer"]}
        parentid="mixer"
        getter={function(){return [...tracks.map((t)=> t.voiceparams.level),peerlvl]}}
        setter={
            function(v,i){
                if(i != 4){
                    tracks[i].voiceparams.level = v;
                    if(isPeerConnected){emitCtrlChange("level",i,tracks[i].voiceparams.level);}
                }
                else{
                    peerlvl = v;
                    if(isPeerConnected){remotetracks.forEach((t)=> t.voiceparams.level = peerlvl);}
                }
            }   
        }
        formaters={range(0,4).map((_)=> {return function(v){return v;}})}
        ></MultiSlider>
    </div> : <span></span>;
    ReactDOM.render(el,document.getElementById("mixerlvls"));
}
function VoiceTypeSelector(){
    if(selectedpage == 1){
        let el = 
        <div>
            <Tab
            labels={["FM","FAT","KICK","NOISE"]}
            getter={function(){return getTrack().voicetype;}}
            setter={
                function(index){
                    getTrack().setvoicetype(index);
                }
            }
            updater={function(){render();}}
            ></Tab>
        </div>
        ReactDOM.render(el,document.getElementById("voicetypeselect"));
    }
    else{
        ReactDOM.render(<span></span>,document.getElementById("voicetypeselect"));
    }          
}
function TrackSelector(){
    if([0,1].includes(selectedpage)){
        let el = 
        <div>
            <Tab
            labels={["Track1","Track2","Track3","Track4"]}
            getter={function(){return selectedtrack;}}
            setter={function(index){selectedtrack = index;}}
            updater={function(){render();}}
            ></Tab>
        </div>
        ReactDOM.render(el,document.getElementById("trackselect"));
    }
    else{
        ReactDOM.render(<span></span>,document.getElementById("trackselect"));
    }
}
function PatternSelector(){
    const el = selectedpage == 0 ?
    <div>
        <Tab
        labels={["A","B","C","D"]}
        w={W} h={H * 0.08}
        getter={function(){return getTrack().selectedpattern;}}
        setter={function(index){getTrack().selectpattern(index);}}
        updater={function(){PatternSteps2();PatternSelector();PatternLengthInput();}}
        ></Tab>
    </div> : <span></span>;
    ReactDOM.render(el,document.getElementById("patternselect"));          
}
function PatternParamSelector(){
    const el = selectedpage == 0 ?
    <div>
        <div>param</div>
        <Tab
        labels={["note","atk","dec","ctf"]}
        getter={function(){return getTrack().selectedpatternparam;}}
        setter={function(index){getTrack().selectedpatternparam = index;}}
        updater={function(){PatternSteps2();PatternParamSelector();}}
        ></Tab>
    </div> : <span></span>;
    ReactDOM.render(el,document.getElementById("patternparamselect")); 
}
function PatternLengthInput(){
    const el = selectedpage == 0 ?
    <NumberBox
        label="steps" step={1} min={1} max={48} w={W * 0.20} h={H * 0.05}
        getter={function(){return getTrack().getpattern().len;}}
        setter={
            function(v){
                getTrack().setpatternlength(Math.clamp(v,1,48));
                PatternSteps2();
                PatternLengthInput();
            }
        }
        formater={function(v){return getTrack().getpattern().len;}}
    ></NumberBox> : <span></span>;
    ReactDOM.render(el,document.getElementById("patternlengthinput"));
}

function PatternSteps2(){
    let stepw = (window.screen.availWidth / 8);
    let steph = (window.screen.availHeight / 11);
    let lastY;
    let playedstep = getTrack().currentstep;
    let _param = getTrack().selectedpatternparam;
    let incfn = 
    [
        function(i){return getTrack().incNote(i);},
        function(i){
            let rv = Math.clamp(getTrack().getpattern().atkp[i] + 0.1,0,1.0);
            getTrack().getpattern().atkp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepatk",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        },
        function(i){
            let rv = Math.clamp(getTrack().getpattern().decp[i] + 0.1,0,1.0);
            getTrack().getpattern().decp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepdec",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        },
        function(i){
            let rv = Math.clamp(getTrack().getpattern().ctfp[i] + 0.1,0,1.0);
            getTrack().getpattern().ctfp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepctf",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        }                
    ][_param];
    let decfn = 
    [
        function(i){return getTrack().decNote(i);},
        function(i){
            let rv = Math.clamp(getTrack().getpattern().atkp[i] - 0.1,0,1.0);
            getTrack().getpattern().atkp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepatk",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        },
        function(i){
            let rv = Math.clamp(getTrack().getpattern().decp[i] - 0.1,0,1.0);
            getTrack().getpattern().decp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepdec",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        },
        function(i){
            let rv = Math.clamp(getTrack().getpattern().ctfp[i] - 0.1,0,1.0);
            getTrack().getpattern().ctfp[i] = rv;
            if(isPeerConnected){emitCtrlChange("stepctf",selectedtrack,[getTrack().selectedpattern,i,rv]);}
            return "+" + rv.toFixed(2);
        }                
    ][_param];
    let valfn = 
    [
        function(i){return Tone.Frequency(getTrack().getpattern().np[i],'midi').toNote()},
        function(i){return "+" + getTrack().getpattern().atkp[i].toFixed(2)},
        function(i){return "+" + getTrack().getpattern().decp[i].toFixed(2)},
        function(i){return "+" + getTrack().getpattern().ctfp[i].toFixed(2)}
    ][_param];
    const el = selectedpage == 0 ? 
    <div className="row" style={{width:stepw * 8 + "px"}}>{
        range(0,getTrack().getpattern().len - 1).map((function(ind){
            let r = 
            <Step 
            key={ind}
            index={ind}
            incrementor={incfn}
            decrementor={decfn}
            active={getTrack().getpattern().gp[ind] == 1} 
            played={playedstep == ind}
            val={valfn(ind)}
            ></Step>
            return r;
        }))
    }</div> : <span></span>;
    ReactDOM.render(el,document.getElementById('patternsteps'));  
}


function PlayToggle(){
    const el = selectedpage == 0 ? 
    <div style={{width:W * 0.2 + "px",height:H * 0.08 + "px",lineHeight:H * 0.05 + "px", textAlign:"center",fontSize:H * 0.05 / 2 + "px", margin:"1px"}}>   
        <Toggle
            statelabels={["play","stop"]}
            w={W * 0.25} h={H * 0.05}
            getter={function(){return isPlaying;}}
            setter={
                function(e){
                    if(isPlaying){
                        isPlaying = false;
                        tracks.forEach((t)=> t.voice.synth.pause());
                        metro.stop();
                        if(isPeerConnected){socket.emit("playbackstop",session);}
                    }
                    else{
                        isPlaying = true;
                        tracks.forEach((t)=> t.voice.synth.play());
                        metro.start();
                        if(isPeerConnected){socket.emit("playbackstart",session);}
                    }
                }
            }
            updater={
                function(){PlayToggle();}
            }
        ></Toggle>
    </div> : <span></span>;
    ReactDOM.render(el,document.getElementById("playtoggle"));
}
function BpmCtrl(){
    const el = selectedpage == 0 ?
    <NumberBox
        label="bpm" min={10} max={300} step={1} decimals={0} w={W * 0.25} h={H * 0.05}
        getter={function(){return timbre.bpm;}}
        setter={
            function(v){
                timbre.bpm = parseInt(v);
                metro.interval = "L16";
            }
        }
        updater={function(){BpmCtrl();}}
        formater={function(v){return timbre.bpm;}}
    ></NumberBox> : <span></span>;
    ReactDOM.render(el,document.getElementById("bpmctrl"));
}
function PageSelector(){
    const el =
    <Tab
    labels={["SEQ","VOICE","MIXER","CONNECTION"]}
    w={W} h={H * 0.05}
    getter={function(){return selectedpage}}
    setter={function(index){selectedpage = index;}}
    updater={function(){render();}}
    ></Tab>
    ReactDOM.render(el,document.getElementById("pageselect"));  
}
function Connectbtn(){
    let p = document.getElementById("connectbtn");
    if(selectedpage == 3){
        let s = {
            backgroundColor:"gray",
            textAlign:"center",
            lineHeight:H * 0.05 + "px",
            width:W * 0.2 + "px",
            height:H * 0.05 + "px",
            color:"white",
            fontSize:H * 0.01 + "px"
        }
        if(!isPublic){
            let el = 
            <div style={s} 
            className="panel" 
            onClick={enterModal}
            >Enter</div>
            ReactDOM.render(el,p);
        }
        else{
            let el = 
            <div style={s} 
            className="panel" 
            onClick={
                function(){
                    socket.emit('exit',session);                
                }
            }
            >Leave</div>
            ReactDOM.render(el,p);            
        }
    }
    else{
        ReactDOM.render(<span></span>,p);
    }
}
function NicknameHeader(){
    let p = document.getElementById("nicknameheader");
    let el = selectedpage == 3 ? 
    <div>{
        isPublic ? <h3>{"nickname: " + nickname}</h3> : <h3>not conected</h3>
    }</div> : <span></span>
    ReactDOM.render(el,p);
}
function UserList(){
    let p = document.getElementById("userlist");
    let el = selectedpage == 3 && isPublic == true && isPeerConnected == false ?
    <div>
        <h3>active users</h3>
        <ul>{
            Object.keys(users).map(function(u,i){
                let r = users[u].nickname != nickname ? 
                <li key={i}>{
                    <span className="userlistItem" onClick={function(){callUser(users[u]);}}>{users[u].nickname}</span>
                }</li>
                :
                <li key={i}></li>
                return r;
            })
        }</ul>
    </div> : <span></span>
    ReactDOM.render(el,p);
}

function render(){
    PlayToggle();
    BpmCtrl();
    PageSelector();
    TrackSelector();
    VoiceTypeSelector();
    PatternSelector();
    PatternLengthInput();
    PatternParamSelector();
    PatternSteps2();
    Vc1();
    Vc2();
    Vc3();
    Vc4();
    Vc5();
    Vc6();
    Vc7();
    Vc8();
    EffectControls0();
    EffectControls1();
    EffectControls2();
    EffectControls3();
    MixerControls();
    Connectbtn();
    NicknameHeader();
    UserList();
}

render();

socket.on('call',function(caller){
    callModal(caller);
});
socket.on('connectpeer',function(calleerespdata){
    let setupdata = tracks.map((t)=> {
        return {
            voicetype:t.voicetype,
            selectedpattern:t.selectedpattern,
            voiceparams:t.voiceparams,
            patterns:t.patterns
        }
    });
    socket.emit('establishconnection',calleerespdata,setupdata);
});
socket.on('peerdisconnected',function(){
    socket.emit('leavesession',session);
    socket.emit('getusers');
    isPeerConnected = false;
    isPeerPlaying = false;
    session = null;
    remotetracks = null;   
    nofify("info",5000,"peer left, session closed!");
});

socket.on('playbackstart',function(tracksteps){
    isPeerPlaying = true;    
});
socket.on('playbackstop',function(){
    isPeerPlaying = false;
});

socket.on('resp',function(respobj){
    if(respobj.respcode == 100){
        nickname = respobj.data.nickname;
        isPublic = true;
        users = respobj.data.users;
        nofify("success",5000,respobj.msg);
        Connectbtn();
        NicknameHeader();
        UserList();        
    }
    if(respobj.respcode == 101){
        nofify("error",5000,"already connected!");
    }
    if(respobj.respcode == 102){
        nickname = null;
        isPublic = false;
        users = null;
        Connectbtn();
        NicknameHeader();
        UserList();
    }
    if(respobj.respcode == 103){
        exitloadscreen(function(){nofify("info",5000,"call was rejected!")});
    }
    if(respobj.respcode == 104){
        isPeerConnected = true;
        session = respobj.data.sessionid;
        remotetracks = respobj.data[nickname].map((td,i)=> new RemoteTrack(td,i));
        Connectbtn();
        NicknameHeader();
        UserList();
        exitloadscreen(function(){nofify("success",5000,"peer connected! session active!")});     
    }
    if(respobj.respcode == 105){
        users = respobj.data;
        UserList();
        Connectbtn();
        NicknameHeader(); 
    }
});


window.addEventListener("beforeunload", function (e) {
  var confirmationMessage = isPeerConnected ? "leavesession?" : null;
  e.returnValue = confirmationMessage;     // Gecko, Trident, Chrome 34+
  return confirmationMessage;              // Gecko, WebKit, Chrome <34
});


window.onunload = function(){
    console.log("yo");
    socket.emit('exit',session); 
}

function enterModal(){
    let m = 
    <InputModal 
    modaltitle="Go public!"
    modalid="entermodal"
    inputlabel="enter nickname!" 
    dismisslabel="cancel" 
    submitlabel="submit"
    dismisshandler={
        function(){
            $("#entermodalinput").val("");
            $("#entermodal").modal('hide');
        }
    }
    submithandler={
        function(str){
            if(str != null){
                socket.emit('enter',str);
                $("#entermodalinput").val("");
                $("#entermodal").modal('hide');
            }
        }
    }
    ></InputModal>;
    ReactDOM.render(m,document.getElementById("modalcontainer"));
    $("#entermodal").modal();
}

function callModal(caller){
    let m = 
    <ConfirmModal 
    modaltitle={caller.nickname+" wants to jam!"}
    modalid="callmodal"
    dismisslabel="decline" 
    confirmlabel="accept"
    dismisshandler={
        function(){
            socket.emit("callreject",caller.id);
            $("#callmodal").modal('hide');
        }
    }
    confirmhandler={
        function(){
            let setupdata = tracks.map((t)=> {
                return {
                    voicetype:t.voicetype,
                    selectedpattern:t.selectedpattern,
                    voiceparams:t.voiceparams,
                    patterns:t.patterns
                }
            });
            socket.emit('callresponse',caller.id,caller.nickname,nickname,setupdata);
            $("#callmodal").modal('hide');            
        }
    }
    ></ConfirmModal>;
    ReactDOM.render(m,document.getElementById("modalcontainer"));
    $("#callmodal").modal();   
}


function nofify(_type,timeout,msg){
    let t = "alert alert-"+_type;
    $("#notification-container").get(0).innerHTML = "<div id='notification' class='alert alert-"+_type+"' role='alert'><h4>"+msg+"</h4></div>";
    setTimeout(function(){
        $("#notification").fadeOut(200,"linear",function(){
            $("#notification-container").get(0).innerHTML = "";
        });
    },timeout);
}

function enterloadscreen(loadmsg){
    $("#overlay").addClass('active');
    $("#spinner").addClass('loader');
    $("#loadmsg").text(loadmsg);
}
function exitloadscreen(fn){
    $("#overlay").removeClass('active');
    $("#spinner").removeClass('loader');
    $("#loadmsg").text("");
    fn();
}

function callUser(userdata){
    socket.emit("callrequest",userdata.id);
    enterloadscreen("calling...");
}






