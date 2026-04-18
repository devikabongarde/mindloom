module.exports = {
  // Client -> Server
  CURSOR_MOVE: 'cursor:move',
  LINK_ADD: 'link:add',
  LINK_CLICK: 'link:click',
  LINK_REACT: 'link:react',
  SHELF_JOIN: 'shelf:join',
  SHELF_LEAVE: 'shelf:leave',
  
  // Server -> Client
  CURSOR_UPDATE: 'cursor:update',
  LINK_ENRICHED: 'link:enriched',
  LINK_DIED: 'link:died',
  LINK_REACTED: 'link:reacted',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  SHELF_WEATHER_UPDATE: 'shelf:weather:update',
  LINK_DECAY_UPDATE: 'link:decayUpdate'
};
