import { pineconeDB } from '../index';

interface SearchResult {
    id: string;
    score: number;
    values: any[];
    sparseValues: any | null;
    metadata: {
        book: string;
        chapter: number;
        text: string;
        verse: number;
    };
}

interface FoundVerse {
    id: string;
    score: number;
    text: string;
}

function findConsecutiveVerses(book, chapter, results): SearchResult[] {
    let currentGroup: SearchResult[] = [];

    // Filter results by the specified book and chapter
    const filteredResults = results.filter((result: SearchResult) => result.metadata.book === book && result.metadata.chapter === chapter);

    // Sort filtered results by verse
    const sortedResults = filteredResults.sort((a: SearchResult, b: SearchResult) => a.metadata.verse - b.metadata.verse);

    for (let i = 0; i < sortedResults.length - 1; i++) {
        currentGroup.push(sortedResults[i]);
    }

    // Add the last verse to the current group and append the group to consecutiveGroups
    currentGroup.push(sortedResults[sortedResults.length - 1]);

    return currentGroup;
}

function getNthElementBookAndChapter(n, results) {
    if (n >= 0 && n < results.length) {
        const nthResult: SearchResult = results[n];
        return [nthResult.metadata.book, nthResult.metadata.chapter];
    }
}

async function stitchVerses(results) {
    const firstVerse: FoundVerse = { id: results[0].id, score: results[0].score, text: results[0].metadata.text };
    let passage = await getPastVersesUntilSentence(firstVerse);
    console.log(passage);
    return passage;

    if (results.length == 1) return { id: results[0].id, score: results[0].score, text: results[0].metadata.text };


    let totalScore = 0;
    let stitchedText = '';
    let startVerse = results[0].metadata.verse;
    let endVerse = results[results.length - 1].metadata.verse;
    let count = 0;


    for (const result of results) {
        totalScore += result.score;
        stitchedText += result.metadata.text + ' ';
        count++;

    }

    const averageScore = totalScore / count;
    const id = `${results[0].metadata.book}_${results[0].metadata.chapter}:${startVerse}-${endVerse}`;

    return {
        id,
        averageScore,
        text: stitchedText.trim(),
    };
}

async function getPastVersesUntilSentence(foundVerse: FoundVerse) {
    let verseId = foundVerse.id;
    let score = foundVerse.score;
    let text = foundVerse.text;

    const regex = /:(\d+)/;
    const match = verseId.match(regex);
    let pastVerses = text;

    if (!match) {
        console.log("No match found");
        return null;
    }

    let verseNum = parseInt(match[1]);
    let earliestVerseNum = verseNum;
    let latestVerseNum = verseNum;

    let avgScore = score;
    let maxIterations = 100;
    let iterations = 0;

    let isBeginning = false;
    let isEnd = false;

    // Search backward for the beginning of the sentence
    while (!isBeginning && iterations < maxIterations) {
        iterations++;
        try {
            const newVerseId = verseId.slice(0, -2) + (verseNum - 1).toString();
            const newVerse: any = await pineconeDB.fetch([newVerseId]);
            const newVerseText = newVerse.records[newVerseId].metadata.text;

            isBeginning = isBeginningOfSentence(newVerseText);
            avgScore = (avgScore + newVerse.score) / 2;
            pastVerses = newVerseText + ' ' + pastVerses;

            earliestVerseNum = verseNum - 1;
            verseNum--;

        } catch (error) {
            console.log("Error fetching verse:", error);
            break;
        }
    }

    // Reset for forward search
    iterations = 0;
    verseNum = parseInt(match[1]);

    // Search forward for the end of the sentence
    while (!isEnd && iterations < maxIterations) {
        iterations++;
        try {
            const newVerseId = verseId.slice(0, -2) + (verseNum + 1).toString();
            const newVerse: any = await pineconeDB.fetch([newVerseId]);
            const newVerseText = newVerse.records[newVerseId].metadata.text;

            isEnd = newVerseText.endsWith('.') || newVerseText.endsWith('!');
            avgScore = (avgScore + newVerse.score) / 2;
            pastVerses = pastVerses + ' ' + newVerseText;

            latestVerseNum = verseNum;
            verseNum++;

        } catch (error) {
            console.log("Error fetching verse:", error);
            break;
        }
    }

    // Construct the new verseId with the range
    const parts = verseId.split(':');
    if (earliestVerseNum < latestVerseNum)
        verseId = `${parts[0]}:${earliestVerseNum}-${latestVerseNum}`;
    return { id: verseId, score: avgScore, text: pastVerses };
}


function isBeginningOfSentence(verse) {
    return /^[A-Z]/.test(verse);
}

export async function givenMatchGetNthResults(n, matches) {
    const [book, chapter] = getNthElementBookAndChapter(n, matches) || [null, null];
    const consecVerses = findConsecutiveVerses(book, chapter, matches);
    return await stitchVerses(consecVerses)
}