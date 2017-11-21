﻿window.owmAPIkey = "65b3dc1574aadec85e6638331e30b380"; // dluciv@gmail.com
window.exports = {};

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;


window.weather = "";

var _units = {
  "градус" : ["градуса", "градусов"],
  "метр" : ["метра", "метров"],
  "миллиметр" : ["миллиметра", "миллиметров"],
  "процент": ["процента", "процентов"],
  "тюлень": ["тюленя", "тюленей"],
};

for(var u in _units)
  if(_units.hasOwnProperty(u))
     _units[u].unshift(u);


function declinateUnit(value, unit){
  var a = _units[unit];
  if(value < 0)
    value = -value;
  var lastdigit = value % 10;
  var lasttwodigits = value % 100;
  if(lasttwodigits >= 10 && lasttwodigits <= 20)
    lastdigit = 5;

  switch(lastdigit){
    case 0:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
      return a[2];
    case 1:
      return a[0];
    case 2:
    case 3:
    case 4:
      return a[1];
  }
}

$(document).ready(function() {
  var lat, lon, api_url;

  var getweather = function(req, where) {
    $.ajax({
      url: api_url,
      method: 'GET',
      success: function(data) {

        var tempr = Math.round(data.main.temp);
        var wind = Math.round(data.wind.speed);
        var vis = data.visibility;
        var hum = Math.round(data.main.humidity);
        var prs = Math.round(0.750062 * data.main.pressure);

        window.weather =
          "Температура " + where +
          " — "          + tempr + ' ' + declinateUnit(tempr, "градус"   ) + '. ' +
          "Ветер — "     + wind  + ' ' + declinateUnit(wind,  "метр"     ) + ' в секунду. ' +
          "Влажность — " + hum   + "%. " +
          "Давление — "  + prs   + ' ' + declinateUnit(prs,   "миллиметр") + ' ртутного столба. ';

        console.log(window.weather);
      }
    });
  }

  if (false && "geolocation" in navigator) { // to slow on mobiles...

    navigator.geolocation.getCurrentPosition(gotLocation);

    var gotLocation = function(position) {
      lat = position.coords.latitude;
      lon = position.coords.longitude;

      api_url = 'http://api.openweathermap.org/data/2.5/weather?lat=' +
        lat + '&lon=' +
        lon + '&units=metric&appid=' + window.owmAPIkey;
      // http://api.openweathermap.org/data/2.5/weather?q=London,uk&callback=test&appid=b1b15e88fa79722

      getweather(api_url, "за бортом");
    }
  } else {
    // alert('Your browser doesnt support geolocation. Sorry.');
      // var api_url = 'http://api.openweathermap.org/data/2.5/weather?lat=60.439803&lon=30.097812&units=metric&appid=' + window.owmAPIkey;
      api_url = 'https://api.openweathermap.org/data/2.5/weather?id=498817&units=metric&appid=' + window.owmAPIkey;

      getweather(api_url, "в И́нгрии");
  }

});

function speaksmth(text) {
  var synth = window.speechSynthesis;
  // var voices = synth.getVoices();

  var utterThis = new SpeechSynthesisUtterance(text);
  utterThis.rate = 1.1;
  utterThis.pitch = 1.5;
  utterThis.lang = 'ru-RU';
  // utterThis.voice = voices[0];

  synth.speak(utterThis);
};

var seals_ok = "Ситуация с тюленями обнадёживающая.";
var seals_not_ok = "Ситуация с тюленями угрожающая.";
var seals_default = "Ситуация с тюленями спокойная.";
var seals_full_prefix = "Центр реабилитации морских млекопитающих Ленинградской области сообщает: ";
window.seals = seals_default;
window.seals_full = seals_default;
var seals_url = 'https://matrix.dluciv.name/vksealrescuerss';

var get_ewma = function(now, moments, half_life, notolder) {

  var events = moments.slice();
  events.sort();
  var total_weighted_events = 0.0;

  for(var i = 0; i < events.length; ++i) {
    var e = events[i];
    var d = (now - e) / 1000.0;
    if(d > notolder)
      continue;
    var weight = Math.pow(2, -d/half_life);
    total_weighted_events += weight;
  }

  // total_weighted_seconds = \sum_{d = 0}^{analysis_period} 2^{-d/half_life} =
  // \frac{1 - q^n}{1-q}, q^{half_life} = 1/2.

  var q = Math.pow(2, -1/half_life);
  var total_weighted_time = (1 - Math.pow(q, notolder)) / (1 - q);

  return total_weighted_events / total_weighted_time;
}

window.seal_back_value = " ";

var measure_seal_background = function(parsed) {
  var now = new Date().getTime();
  var pubdates = [];
  $(parsed).find('item pubDate').each(function(){
    pubdates.push(new Date($(this).text()).getTime());
  });

  var halflife = 60*60*24*1; // 1 сутки - период полураспада события
  var ap = 31536000 / 12; // анализируем за месяц
  var tulsec = get_ewma(now, pubdates, halflife, ap);
  var micro_tul_hour = Math.round(tulsec * 1e6 * 3600);
  window.seal_back_value = " Фон — " + micro_tul_hour + " микро" + declinateUnit(micro_tul_hour, "тюлень") + " в час. ";
}

var getSealStatus = function(callback) {
		$.ajax({
				method: 'GET',
				url: seals_url,
				success: function(data) {
						// console.log('ok', data);
						var parsed = $.parseXML(data);
						measure_seal_background(parsed);
						var lastPostHtml = $(parsed).find('item description').first().text();
						var lastPostText = $(lastPostHtml).text();
						console.log(lastPostText);
						if (lastPostText != null && lastPostText != undefined && lastPostText.trim() != '') {
								var moodInfo = analyze(lastPostText);
								// console.log(moodInfo);
								callback(moodInfo.score, lastPostText);
						}
				},
				error: function(err) {
						console.log('err', err);
						callback(0, "");
				}
		})
}
getSealStatus(function(status, text) {
    window.seals = (status >= 0) ? seals_ok : seals_not_ok;
    if (text.trim()) {
	window.seals_full = window.seals + window.seal_back_value + " " + seals_full_prefix + text;
    }
    else {
	window.seals_full = window.seals;
    }
});

window.woodcocks = "Ситуация с ва́льдшнепами спокойная.";
var zp = 800 + Math.round(Math.random()*50);
window.zombies = "Вероятность зомби-атаки — " + zp + " на миллион. Это меньше статистической погрешности.";

function tell_status() {
  window.speaksmth("Привет! Говорит И́нкери Норпа Лехтокурпа. " + window.weather + ' ' +  window.seals + ' ' + window.seal_background_value + ' ' +  window.woodcocks + ' ' + window.zombies + ' ' + "Спасибо, всего доброго!");
};

window.recognition = new SpeechRecognition();
recognition.lang = 'ru-RU';
recognition.interimResults = false;
// recognition.maxAlternatives = 0;

window.recognition.onresult = function(event) {
  var speechResult = event.results[0][0].transcript
  // diagnosticPara.textContent = 'Speech received: ' + speechResult + '.';
  console.log('Result: ' + speechResult);
  console.log('Confidence: ' + event.results[0][0].confidence);

  var response = "Извините, не поняла, что значит " + speechResult + ". Меня можно спросить про погоду, тюленей, вальдшнепов и зомби.";

  speechResult = speechResult.toLowerCase();
  if(speechResult.includes("тюлен"))
  {
    response = window.seals_full;
  } else if(speechResult.includes("вальдшне")) {
    response = window.woodcocks;
  } else if(speechResult.includes("зомби")) {
    response = window.zombies;
  } else if(speechResult.includes("погод")) {
    response = window.weather;
  }
  window.speaksmth(response);
}

window.recognition.onspeechend = function() {
  var sttBtn = document.querySelector('#sttbtn');
  sttBtn.disabled = false;
  window.recognition.stop();
}

window.recognition.onerror = function(event) {
  var sttBtn = document.querySelector('#sttbtn');
  sttBtn.disabled = false;
  alert("Speech recognition error: " + event.error);
}

function stt() {
  var sttBtn = document.querySelector('#sttbtn');
  sttBtn.disabled = true;
  window.recognition.start();
};
