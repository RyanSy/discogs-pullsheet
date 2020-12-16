var dotenv = require('dotenv');
dotenv.load();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var store = new MongoDBStore({
  uri: `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.eujqg.mongodb.net/sessions?retryWrites=true&w=majority`,
  databaseName: 'discogs-pullsheet',
  collection: 'sessions',
  expires: 1000 * 60 * 60 * 24 * 30
});
 store.on('error', function(error) {
   console.log(error);
 });

var indexRouter = require('./routes/index');
var authorizeRouter = require('./routes/authorize');
var callbackRouter = require('./routes/callback');
var itemsRouter = require('./routes/items');
var logoutRouter = require('./routes/logout');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(session({
  secret: process.env.SECRET,
  cookie: {
    maxAge: 2.628e+9
  },
  store: store,
  resave: false,
  saveUninitialized: true
}));

app.use('/', indexRouter);
app.use('/authorize', authorizeRouter);
app.use('/callback', callbackRouter);
app.use('/items', itemsRouter);
app.use('/logout', logoutRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

console.log("Running!");

module.exports = app;
