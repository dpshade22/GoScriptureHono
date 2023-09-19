import { Hono } from 'hono'
import { searchHandler } from './handlers/searchHandler'
import { handle } from 'hono/vercel'

const app = new Hono()

app.get('/', (c) => {
    return c.text(`The current router is ${app.routerName}`)
})

app.get('/search', searchHandler);

app.showRoutes()

export default handle(app)
