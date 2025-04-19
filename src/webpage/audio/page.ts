import { BinWrite } from "../utils/binaryUtils.js";
import { setTheme } from "../utils/utils.js";
import { Play } from "./play.js";

setTheme();
const w = new BinWrite(2 ** 12);
w.writeStringNo("jasf");
w.write8(4);

w.writeString8("sin");
w.write32Float(0);
w.writeString8("triangle");
w.write32Float(0);
w.writeString8("square");
w.write32Float(0);

w.writeString8("custom");
w.write32Float(150);
//return Math.sin(((t + 2) ** Math.cos(t * 4)) * Math.PI * 2 * freq);
//Math.sin((((t+2)**Math.cos((t*4)))*((Math.PI*2)*f)))
w.write8(4); //sin
w.write8(5); //times
{
	w.write8(9); //Power
		w.write8(6); //adding
		w.write8(1); //t
		w.write8(0);
		w.write32Float(2); //2
	w.write8(13); //cos
	w.write8(5); // times
	w.write8(1); //t
	w.write8(0);
	w.write32Float(4); //4
}
{
	w.write8(5); //times
	w.write8(5); //times
	w.write8(3); //PI
	w.write8(0);
	w.write32Float(2); //2
	w.write8(2); //freq
}

w.write16(4); //3 tracks

w.write16(1); //zip
w.write8(4);
w.write32Float(1);
w.write32Float(700);

w.write16(3); //beep
{
	w.write8(1);
	w.write32Float(1);
	w.write32Float(700);
	w.write32Float(50);

	w.write8(0);
	w.write32Float(100);

	w.write8(1);
	w.write32Float(1);
	w.write32Float(700);
	w.write32Float(50);
}

w.write16(5); //three
{
	w.write8(1);
	w.write32Float(1);
	w.write32Float(800);
	w.write32Float(50);

	w.write8(0);
	w.write32Float(50);

	w.write8(1);
	w.write32Float(1);
	w.write32Float(1000);
	w.write32Float(50);

	w.write8(0);
	w.write32Float(50);

	w.write8(1);
	w.write32Float(1);
	w.write32Float(1300);
	w.write32Float(50);
}

w.write16(5); //square
{
	w.write8(3);
	w.write32Float(1);
	w.write32Float(600);
	w.write32Float(50);

	w.write8(0);
	w.write32Float(50);

	w.write8(3);
	w.write32Float(1);
	w.write32Float(800);
	w.write32Float(50);

	w.write8(0);
	w.write32Float(50);

	w.write8(3);
	w.write32Float(1);
	w.write32Float(1000);
	w.write32Float(50);
}
w.write16(4); //2 audio

w.writeString8("zip");
w.write16(1);
w.write16(1);

w.writeString8("beep");
w.write16(1);
w.write16(2);

w.writeString8("three");
w.write16(1);
w.write16(3);

w.writeString8("square");
w.write16(1);
w.write16(4);
const buff = w.getBuffer();
const play = Play.parseBin(buff);
/*
const zip=play.audios.get("square");
if(zip){
    setInterval(()=>{
        zip.play()
    },1000)
    ;
    console.log(play.voices[3][0].info.wave)
};
*/
console.log(play, buff);

const download = document.getElementById("download");
if (download) {
	download.onclick = () => {
		const blob = new Blob([buff], { type: "binary" });
		const downloadUrl = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = downloadUrl;
		a.download = "sounds.jasf";
		document.body.appendChild(a);
		a.click();
		URL.revokeObjectURL(downloadUrl);
	};
}
