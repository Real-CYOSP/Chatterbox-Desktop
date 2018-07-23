const tls = require('tls');
const fs = require('fs');

print('Hello! Welcome to Chatterbox!');

const options = {
    ca: [ fs.readFileSync('ca.crt') ]
};

// Any site you connect to MUST have a pem file and you must supply the corresponding crt
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
    console.log(data);

    if (data.hasOwnProperty("USERNAME_ACCEPTED")) {
        if (data.USERNAME_ACCEPTED) {
            printMessages(data.MESSAGES);
            initUsers(data.USER_LIST);
            setInputFlow(loop, false);
            setInputFlow(chat, true);
        } else {
            window.username = '';
            promptUsername();
        }
    } else if (data.hasOwnProperty("MESSAGES")) {
        printMessages(data.MESSAGES);
    } else if (data.hasOwnProperty("USERS_JOINED")) {
        modifyUsers(data.USERS_JOINED, true);
    } else if (data.hasOwnProperty("USERS_LEFT")) {
        modifyUsers(data.USERS_LEFT, false);
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
Pre: an array of user objects
Post: null
Purpose: takes in a list of user objects on login and appends 
    them to the appropriate list on screen based off of if the user is active
*/
function initUsers(userlist) {
    let online = document.getElementById('online');
    let offline = document.getElementById('offline');

    userlist.map(user => {
        let li = document.createElement('li');
        li.innerText = user.name;

        if (user.active) {
            online.appendChild(li);
        } else {
            offline.appendChild(li);
        }
    })
}

/*
Pre: null
Post: null
Purpose: Prints user messages to screen when network is 
    unavailable or no other chat function in place
*/
function loop() {
    let message = getInput();
    print(message);
}

/*
Pre: array of usernames, and boolean stating if we are adding a user
Post: null
Purpose: takes a list of names and if we are adding them removes them from
    the offline list in view, if applicable, and adds them to the online list. 
    For removing is is the same process but in the opposite direction
*/
function modifyUsers(userlist, add) {
    let newList;
    let oldList;

    if (add) {
        oldList = document.getElementById('offline');
        newList = document.getElementById('online');
    } else {
        oldList = document.getElementById('online');
        newList = document.getElementById('offline');
    }

    Array.from(oldList.getElementsByTagName('li')).forEach(user => {
        userlist.forEach(username => {
            if (username === user.innerText) {
                oldList.removeChild(user);
            }
        });
    });

    userlist.forEach(username => {
        let exists = false;

        Array.from(newList.getElementsByTagName('li')).forEach(user => {
            if (user.innerText === username) {
                exists = true;
            }
        });

        if (!exists) {
            let li = document.createElement('li');
            li.innerText = username;

            newList.appendChild(li);
        }
    });
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
function print( /*String*/ msg, username, timestamp) {
    let li = document.createElement('li');
    li.innerHTML = msg;

    username = username || 'system';

    li.setAttribute('data-author', username);

    timestamp = timestamp ? new Date(timestamp) : new Date();

    timestamp = [
        timestamp.getMonth()+1,
        timestamp.getDate(),
        timestamp.getFullYear()
    ].join('/') + ' ' +
    [
        timestamp.getHours(),
        timestamp.getMinutes(),
        timestamp.getSeconds()
    ].join(':');

    li.setAttribute('data-timestamp', timestamp);

    if (username === window.username) {
        li.classList.add('self');
    }

    document.getElementById('messages').appendChild(li);
    document.getElementById('messages').scrollTo(0, document.getElementById('messages').scrollHeight);
}

/*
Pre: array of message objects
Post: null
Purpose: prints out messages for user in chat
*/
function printMessages( /*Array<Object>*/ arr) {
    arr.map(msg => {
        if (msg[1] === 'ALL' || msg[1] === window.username) {
            print(msg[3], msg[0], msg[2] * 1000);
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