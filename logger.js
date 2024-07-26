const winston = require('winston');
const { Syslog } = require('winston-syslog');

const logger = winston.createLogger({
  level: 'info', 
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(info => {
      return `${info.timestamp} ${info.level.toUpperCase()}: ${info.message} ${info.meta ? JSON.stringify(info.meta) : ''}`;
    })
  ),
  transports: [
    // Log to a single file
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),

    // Log to syslog
    new Syslog({
      host: 'logs4.papertrailapp.com', // Replace with your syslog server address
      port: 49996, // Default syslog port
      protocol: 'tls4',
      eol: '\n',

    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
    new Syslog({
      host: 'logs4.papertrailapp.com',
      port: 49996,
      protocol: 'tls4',
      eol: '\n',
    })
  ]
});

module.exports = logger;
