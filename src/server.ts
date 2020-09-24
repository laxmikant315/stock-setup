import App from './app'

import * as bodyParser from 'body-parser'
import loggerMiddleware from './middleware/logger'

import HomeController from './controllers/home/home.controller'
import { env } from 'process'

const cors = require('cors')
require('dotenv').config()


const app = new App({
    port: +env.PORT || 5004,
    controllers: [
        new HomeController()
    ],
    middleWares: [
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true }),
        loggerMiddleware,
        cors()
       
    ]
})
app.listen()

