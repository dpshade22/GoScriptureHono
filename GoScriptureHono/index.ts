import { Hono } from 'hono'
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { givenMatchGetNthResults } from './passage/passageBuilder'

const app = new Hono()
const openai = new OpenAI();
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
    environment: 'gcp-starter',
});

app.get('/', (c) => {
    return c.text(`The current router is ${app.routerName}`)
})

app.get('/search', async (c) => {
    const query = c.req.query('query');

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query || '',
    });
    const queryVector = embedding.data[0].embedding;
    const results = await pinecone.index('web').query({ topK: 50, vector: queryVector, includeMetadata: true });
    const resp = givenMatchGetNthResults(0, results.matches);

    return c.json(resp);
})

app.showRoutes()

export default {
    port: 3000,
    fetch: app.fetch,
}