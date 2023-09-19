// searchHandler.js
import { combineLists } from '../helpers/mergeVerses';
import { checkIfUserSearchContainsSpecificVerse, fetchPassage } from '../helpers/regexMatch';
import { Pinecone } from '@pinecone-database/pinecone'
import { getVectorEmbeddingFromQuery } from '../helpers/openaiAPI';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: 'gcp-starter',
});

export const pineconeDB = pinecone.index('web-bible');

export async function searchHandler(c) {
    const searchQuery = c.req.query('q');

    const [isValid, searchId] = checkIfUserSearchContainsSpecificVerse(searchQuery)

    if (isValid) {
        console.log('Query is a valid location');
        const resp = await fetchPassage(searchId)
        if (resp)
            return c.json(resp);
    }

    const queryVectorEmbedding = await getVectorEmbeddingFromQuery(searchQuery);
    const results = await pineconeDB.query({ topK: 500, vector: queryVectorEmbedding, includeMetadata: true });
    const finalResultsList = combineLists(results.matches);


    return c.json(finalResultsList);
}