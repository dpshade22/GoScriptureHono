// searchHandler.js
import { combineLists } from '../helpers/simplifyLocation';
import { checkIfUserSearchContainsSpecificVerse, fetchPassage } from '../helpers/regexMatch';
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'


const openai = new OpenAI();
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: 'gcp-starter',
});

export const pineconeDB = pinecone.index('web-bible');

export async function searchHandler(c) {
    const searchQuery = c.req.query('q');

    const [isValid, searchId] = checkIfUserSearchContainsSpecificVerse(searchQuery)

    if (isValid) {
        const resp = await fetchPassage(searchId)
        if (resp)
            return c.json(resp);
    }
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: searchQuery || '',
    });
    const queryVector = embedding.data[0].embedding;
    const results = await pineconeDB.query({ topK: 500, vector: queryVector, includeMetadata: true });
    const finalResultsList = combineLists(results.matches);


    return c.json(finalResultsList);
}