import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes/index';
import usersRouter from './routes/users';

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.set('trust proxy', '127.0.0.1');

app.use('/', indexRouter);
app.use('/users', usersRouter);

// view engine setup
app.set('views', path.join(__dirname, '../server/views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, '../public')));

export default app;
