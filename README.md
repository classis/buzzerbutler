# buzzerbutler
Project to create an automated butler for apartment buzzing systems to allow multiple phone numbers to be called or passcodes

## How to use

### From Source
1. npm install
2. modify the values in config/default.yml
3. npm start
4. make sure in twilio the all calls come in for the phone number go to {host}/twilio

### From Docker
1. docker run classis/buzzerbutler
2. set the following env variables

TWILIO_ACCOUNT_SID

TWILIO_TOKEN

TWILIO_LOCATION_NAME

TWILIO_PHONE_NUMBER
