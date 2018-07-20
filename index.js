const tls = require('tls');
const fs = require('fs');

print('Hello! Welcome to Chatterbox!');

const options = {
    ca: [ fs.readFileSync('ca.crt') ]
};

var socket = tls.connect(9000, 'localhost', options, () => {
    console.log('client connected',
        socket.authorized ? 'authorized' : 'unauthorized');
    
    promptUsername();
});

socket.setEncoding('utf8');
socket.on('connect', () => {
    console.log('connection is on point');
});

socket.on('data', (data) => {
    data = JSON.parse(data.substr(4, data.length));

    if (data.hasOwnProperty("USERNAME_ACCEPTED")) {
        if (data.USERNAME_ACCEPTED) {
            printMessages(data.MESSAGES);
            setInputFlow(loop, false);
            setInputFlow(chat, true);
        } else {
            window.username = '';
            promptUsername();
        }
    } else if (data.hasOwnProperty("MESSAGES")) {
        printMessages(data.MESSAGES);
    }
});

socket.on('end', () => {
    console.log('Ended');
});

/* 
Pre: Takes in integer
Post: Returns integer in big endian format
Purpose: Allows for size of messages to be prepended to any message being sent
*/
function bigEndianOf( /*Int*/ n)
{
    return Uint8Array.from([
        (n & 0xFF000000) >>> 24,
        (n & 0x00FF0000) >>> 16,
        (n & 0x0000FF00) >>>  8,
        (n & 0x000000FF) >>>  0,
    ]);
}

/*
Pre: null
Post: null
Purpose: Clears user input
*/
function clearInput() {
    document.getElementById('m').value = '';
}

/*
Pre: null
Post: null
Purpose: Get's user input and transforms it into a proper message
*/
function chat(key) {
    if (!key || key.which === 13) {
        let input = getInput();
        let now = Math.floor(new Date() / 1000);
        let audience = window.audience || 'ALL';

        let msg = {
            MESSAGES: [
                [
                    window.username,
                    audience,
                    now,
                    input
                ]
            ]
        };

        sendMessage(msg);
    }
}

/*
Pre: null
Post: Returns user input
Purpose: Retrieve user input and clear the input field
*/
function getInput() {
    let input = document.getElementById('m').value;
    clearInput();

    return input;
}

/*
Pre: null
Post: null
Purpose: Prints user messages to screen when network is unavailable or no other chat function in place
*/
function loop() {
    let message = getInput();
    print(message);
}

/*
Pre: Message in the form of stringified json
Post: Returns message with packed size as a prefix
Post: Create a format for messages that the Chatterbox server can read. See Python 3.6 Struct.pack
*/
function pack( /*String*/ msg) {
    const prefix = new TextDecoder('utf-8').decode(bigEndianOf(msg.length));

    return `${prefix}${msg}`;
}

/*
Pre: Message string
Post: null
Purpose: takes in a string and presents it to the user in chat
*/
function print( /*String*/ msg) {
    let li = document.createElement('li');
    li.innerText = msg;

    document.getElementById('messages').appendChild(li);
}

/*
Pre: array of message objects
Post: null
Purpose: prints out messages for user in chat
*/
function printMessages( /*Array<Object>*/ arr) {
    arr.map(msg => {
        if (msg[1] === 'ALL' || msg[1] === window.username) {
            let date = new Date(msg[2] * 1000);
            date = [
                date.getMonth()+1,
                date.getDate(),
                date.getFullYear()
            ].join('/') + ' ' +
            [
                date.getHours(),
                date.getMinutes(),
                date.getSeconds()
            ].join(':');

            let str = `[${date}] ${msg[0]} : ${msg[3]}`;

            print(str);
        }
    });
}

/*
Pre: null
Post: null
Purpose: sets input flow to submit username and prompts user for said name
*/
function promptUsername() {
    setInputFlow(submitUsername, true);

    print('Please enter your username in the box below');
}

/*
Pre: message object
Post: null
Purpose: transforms message object into something usable by the server and sends it along the socket
*/
function sendMessage( /*Object*/ json) {
    let msg = pack(JSON.stringify(json));
    console.log(msg);
    socket.write(msg);
}

/*
Pre: a callback function and boolean that determines if we are adding an event listener for said function
Post: null
Purpose: Adjusts input callbacks for user input actions. 
If there is a callback function and add is true we add an event listener for it,
if there is a callback function and add is false or undefined we remove the event listener for said function,
and if we don't get a function at all, we set our application to loop
*/
function setInputFlow( /*Function*/ foo, /*Bool*/ add) {
    if (foo && add) {
        document.getElementById('m').addEventListener('keypress', foo);
        document.getElementById('submit').setAttribute('onclick', foo.name);
    } else if (foo && !add) {
        document.getElementById('m').removeEventListener('keypress', foo);
        document.getElementById('submit').setAttribute('onclick', '');
    } else /*if (!foo)*/ {
        document.getElementById('m').addEventListener('keypress', loop);
        document.getElementById('submit').setAttribute('onclick', 'loop');
    }
}

/*

*/
function submitUsername(key) {
    if (!key || key.which === 13) {
        let msg = {
            USERNAME: getInput()
        };

        window.username = msg.USERNAME;

        sendMessage(msg);
        setInputFlow(submitUsername, false);
    }
}