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
            setInputFlow(loop);
        } else {
            window.username = '';
            promptUsername();
        }
    }
});

socket.on('end', () => {
    console.log('Ended');
});

// In theory this function will take user input, transform it into a message, and send it out;
function chat() {
    console.log(getInput());
}

function printMessages(arr) {
    arr.map(msg => {
        if (msg[1] === 'ALL' || msg[1] === window.username) {
            let date = new Date(msg[2] * 1000);
            date = dformat = [date.getMonth()+1,
                date.getDate(),
                date.getFullYear()].join('/')+' '+
            [date.getHours(),
                date.getMinutes(),
                date.getSeconds()].join(':');
            let str = `[${date}] ${msg[0]} : ${msg[3]}`;

            print(str);
        }
    });
}

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

function promptUsername() {
    setInputFlow(submitUsername, true);

    print('Please enter your username in the box below');
}

function setInputFlow(foo, add) {
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

function getInput() {
    return document.getElementById('m').value;
}

function loop() {
    let message = getInput();
    clearInput();
    print(message);
}

function print(msg) {
    let li = document.createElement('li');
    li.innerText = msg;

    document.getElementById('messages').appendChild(li);
}

function sendMessage( /*JSON*/ json) {
    let msg = pack(JSON.stringify(json));
    clearInput();
    socket.write(msg);
}

function clearInput() {
    document.getElementById('m').value = '';
}

function pack( /*String*/ msg) {
    const prefix = new TextDecoder('utf-8').decode(bigEndianOf(msg.length));

    return `${prefix}${msg}`;
}

function bigEndianOf( /*Int*/ n)
{
    return Uint8Array.from([
        (n & 0xFF000000) >>> 24,
        (n & 0x00FF0000) >>> 16,
        (n & 0x0000FF00) >>>  8,
        (n & 0x000000FF) >>>  0,
    ]);
}