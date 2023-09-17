import { Hono } from 'hono'
import { searchHandler } from './handlers/searchHandler'

const app = new Hono()

app.get('/', (c) => {
    return c.text(`The current router is ${app.routerName}`)
})

app.get('/search', searchHandler);

app.showRoutes()

export default {
    port: 3000,
    fetch: app.fetch,
}

