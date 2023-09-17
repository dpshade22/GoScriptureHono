// searchHandler.js
import { combineVerses, combineLists } from '../helpers/simplifyLocation';
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'


const openai = new OpenAI();
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: 'gcp-starter',
});

export const pineconeDB = pinecone.index('web-bible');

export async function searchHandler(c) {
    const query = c.req.query('query');

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query || '',
    });
    const queryVector = embedding.data[0].embedding;
    const results = await pineconeDB.query({ topK: 500, vector: queryVector, includeMetadata: true });

    return c.json(combineLists(combineVerses(results.matches)));
}