import config from 'config';
import express from 'express';
import Twilio from 'twilio';
import tingodb from 'tingodb';
import bodyParser from 'body-parser';

const engine = tingodb();
const dbPath = config.get('dbPath');
const db = new engine.Db(dbPath, {});
// const urlencoded = body_parser.urlencoded;
const VoiceResponse = Twilio.twiml.VoiceResponse;
const port = config.get('port');
const twilioSid = config.get('twilio.accountSid');
const twilioToken = config.get('twilio.authToken');
const locationName = config.get('locationName');
const openTone = config.get('openTone');
const phoneNumber = config.get('phoneNumber');
const accessCodesCol = db.collection('access_codes');
const usersCol = db.collection('users');
let users = [];
let accessCodes = [];
/* eslint-disable no-unused-vars */
const client = new Twilio(twilioSid, twilioToken);
const app = express();

// Parse incoming POST params with Express middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const generateIntro = () => {
  const options = users.map(user => `to ${user.verb} ${user.name} press ${user.code}`).join();
  const whatToSay = `Welcome to ${locationName} ${options}`;
  console.log(whatToSay);
  return whatToSay;
};

app.put('/api/users', (req, res) => {
  console.log(req.body);
  usersCol.remove({});
  users = req.body;
  usersCol.insert(req.body, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.get('/api/users', (req, res) => {
  usersCol.find({}).toArray((err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.put('/api/accesscodes', (req, res) => {
  accessCodesCol.remove({});
  accessCodes = req.body;
  accessCodesCol.insert(req.body, (err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});

app.get('/api/accesscodes', (req, res) => {
  accessCodesCol.find({}).toArray((err, result) => {
    if (err) res.send(err);
    res.send(result);
  });
});


// Passcode check
app.post('/twilio/gatheraccesscode', (req, res) => {
  const twiml = new VoiceResponse();
  if (req.body.Digits) {
    console.log(req.body.Digits);
    const exists = accessCodes.filter(object => (object.value === req.body.Digits));
    if (exists.length !== 0) {
      twiml.say('Correct');
      twiml.play({ digits: openTone });
    } else {
      twiml.say('That is an incorrect accesscode');
    }
  } else {
    twiml.redirect('/twilio');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

// First choice menu
app.post('/twilio/gatherchoice', (req, res) => {
  console.log(req.body);
  const twiml = new VoiceResponse();
  if (req.body.Digits) {
    console.log(req.body.Digits);
    // If the user entered digits, process their request
    const selected = users.filter(object => (object.code === req.body.Digits))
      .map((object) => {
        if (object.verb === 'reach') {
          twiml.dial({ callerId: phoneNumber }, object.phone);
          console.log(twiml.toString());
          twiml.say(`${object.name} didnt answer`);
        } else if (object.verb === 'use') {
          const gather = twiml.gather({ numDigits: 4, action: '/twilio/gatheraccesscode' });
          gather.say('Enter passcode');
        }
        return object;
      });
    if (selected.length === 0) {
      twiml.say('Sorry, I don\'t understand that choice.');
    }
  } else {
    twiml.redirect('/twilio');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});


// Starting point
app.post('/twilio', (req, res) => {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({ numDigits: 1, action: '/twilio/gatherchoice' });
  gather.say(generateIntro());
  twiml.redirect('/twilio');
  res.type('text/xml');
  res.send(twiml.toString());
});


app.listen(port, () => {
  accessCodesCol.find({}).toArray((err, result) => {
    accessCodes = result;
  });
  usersCol.find({}).toArray((err, result) => {
    users = result;
  });
  console.log(`Listening on port ${port}`);
});
