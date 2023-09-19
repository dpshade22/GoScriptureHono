import { OpenAI } from 'openai'
const openai = new OpenAI();

export async function getVectorEmbeddingFromQuery(query) {
    const search = `What does the Bible say about the following: ${query}?`;
    // console.log(search);

    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: search || '',
    });
    return embedding.data[0].embedding;
}