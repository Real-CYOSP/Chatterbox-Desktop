const tls = require('tls');
const fs = require('fs');
const bufferpack = require('bufferpack');

const options = {
    ca: [ fs.readFileSync('ca.crt') ]
};

var socket = tls.connect(9000, 'localhost', options, () => {
    console.log('client connected',
        socket.authorized ? 'authorized' : 'unauthorized');
    
    let msg = '{"USERNAME": "codeWonderland"}';

    msg = pack(msg);
    socket.write(msg);
});

socket.setEncoding('utf8');
socket.on('connect', () => {
    console.log('connection is on point');
});

socket.on('data', (data) => {
    console.log(data);
});

socket.on('end', () => {
    console.log('Ended');
});

function pack( /*String*/ msg) {
    const prefix = new TextDecoder('utf-8').decode(bigEndianOf(msg.length));

    return `${prefix}${msg}`;
}

function bigEndianOf(n)
{
    return Uint8Array.from([
        (n & 0xFF000000) >>> 24,
        (n & 0x00FF0000) >>> 16,
        (n & 0x0000FF00) >>>  8,
        (n & 0x000000FF) >>>  0,
    ]);
}