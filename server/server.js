import config from 'config';
import express from 'express';
import twilio from 'twilio';
import body_parser from 'body-parser';

const urlencoded = body_parser.urlencoded;
const VoiceResponse = twilio.twiml.VoiceResponse;
const port = config.get('port');
const twilio_sid = config.get('twilio.accountSid');
const twilio_token = config.get('twilio.authToken');
const location_name = config.get('locationName');
const users = config.get('users');
const passcodes = config.get('passcodes');
const openTone = config.get('openTone');
const phoneNumber = config.get('phoneNumber');

const client = new twilio(twilio_sid, twilio_token);
const app = express();

// Parse incoming POST params with Express middleware
app.use(urlencoded({extended: false}));

const generateIntro = () => {
  const options = users.map(user => `to ${user.verb} ${user.name} press ${user.code}`).join();
  const whatToSay = `Welcome to ${location_name} ${options}`;
  console.log(whatToSay);
  return whatToSay;
};

app.post('/passcode' ,(req, res) => {
  const twiml = new VoiceResponse();
  if(req.body.Digits) {
    console.log(req.body.Digits);
    if (passcodes.indexOf(req.body.Digits) > -1) {
      twiml.say("Correct");
      twiml.play({ digits: openTone });
    } else {
      twiml.say("That is an incorrect passcode");
    }

  } else {
    twiml.redirect('/twilio');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/gather' ,(req, res) => {
  console.log(req.body);
  const twiml = new VoiceResponse();
  if(req.body.Digits) {
    console.log(req.body.Digits);
    // If the user entered digits, process their request

    const selected = users.filter(object => (object.code === req.body.Digits))
      .map(object => {
        if (object.verb === 'reach'){
          twiml.dial({callerId: phoneNumber}, object.phone);
          console.log(twiml.toString());
          twiml.say(`${object.name} didnt answer`);
        } else if(object.verb === 'use') {
          const gather = twiml.gather({ numDigits: 4, action: '/passcode'});
          gather.say('Enter passcode');
        }
        return object;
      });
    if(selected.length === 0){
      twiml.say('Sorry, I don\'t understand that choice.');
    }
  } else {
    twiml.redirect('/twilio');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.post('/twilio', (req, res) => {
  const twiml = new VoiceResponse;
  if (req.body.Digits) {
    whatTodo(req.body.Digits, twiml);
  } else {
    const gather = twiml.gather({ numDigits: 1, action: '/gather' });
    gather.say(generateIntro());
    twiml.redirect('/twilio');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`)
});
