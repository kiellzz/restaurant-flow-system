const crypto = require('crypto');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();

function createAcceptKey(secWebSocketKey) {
  return crypto
    .createHash('sha1')
    .update(`${secWebSocketKey}${WS_GUID}`)
    .digest('base64');
}

function writeFrame(socket, opcode, payload = Buffer.alloc(0)) {
  const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const payloadLength = payloadBuffer.length;
  let header;

  if (payloadLength < 126) {
    header = Buffer.from([0x80 | opcode, payloadLength]);
  } else if (payloadLength < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);
  }

  socket.write(Buffer.concat([header, payloadBuffer]));
}

function sendJson(socket, data) {
  if (socket.destroyed || !socket.writable) {
    return;
  }

  writeFrame(socket, 0x1, JSON.stringify(data));
}

function readClientFrame(buffer) {
  if (buffer.length < 2) {
    return null;
  }

  const opcode = buffer[0] & 0x0f;
  const isMasked = Boolean(buffer[1] & 0x80);
  let payloadLength = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < offset + 2) {
      return null;
    }

    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === 127) {
    if (buffer.length < offset + 8) {
      return null;
    }

    payloadLength = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  if (!isMasked || buffer.length < offset + 4 + payloadLength) {
    return null;
  }

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;

  const payload = Buffer.alloc(payloadLength);

  for (let index = 0; index < payloadLength; index += 1) {
    payload[index] = buffer[offset + index] ^ mask[index % 4];
  }

  return { opcode, payload };
}

function handleClientData(socket, buffer) {
  const frame = readClientFrame(buffer);

  if (!frame) {
    return;
  }

  if (frame.opcode === 0x8) {
    socket.end();
    return;
  }

  if (frame.opcode === 0x9) {
    writeFrame(socket, 0xA, frame.payload);
  }
}

function createRealtimeServer(server) {
  server.on('upgrade', (req, socket) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const secWebSocketKey = req.headers['sec-websocket-key'];

    if (!secWebSocketKey) {
      socket.destroy();
      return;
    }

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${createAcceptKey(secWebSocketKey)}`,
      '',
      '',
    ].join('\r\n'));

    clients.add(socket);

    sendJson(socket, {
      emittedAt: new Date().toISOString(),
      type: 'connection:open',
    });

    socket.on('data', data => handleClientData(socket, data));
    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
  });
}

function broadcastRealtimeEvent(type, payload = {}) {
  const event = {
    emittedAt: new Date().toISOString(),
    payload,
    type,
  };

  for (const client of clients) {
    try {
      sendJson(client, event);
    } catch (err) {
      clients.delete(client);
    }
  }
}

module.exports = {
  broadcastRealtimeEvent,
  createRealtimeServer,
};
