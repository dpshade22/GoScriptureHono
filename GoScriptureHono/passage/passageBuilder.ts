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

function findConsecutiveVerses(book, chapter, results): SearchResult[][] {
    const consecutiveGroups: SearchResult[][] = [];
    let currentGroup: SearchResult[] = [];

    // Filter results by the specified book and chapter
    const filteredResults = results.filter((result: SearchResult) => result.metadata.book === book && result.metadata.chapter === chapter);

    // Sort filtered results by verse
    const sortedResults = filteredResults.sort((a: SearchResult, b: SearchResult) => a.metadata.verse - b.metadata.verse);

    for (let i = 0; i < sortedResults.length - 1; i++) {
        currentGroup.push(sortedResults[i]);

        // Check if the next verse is consecutive
        if (sortedResults[i].metadata.verse + 1 === sortedResults[i + 1].metadata.verse) {
            continue;
        } else {
            consecutiveGroups.push(currentGroup);
            currentGroup = [];
        }
    }

    // Add the last verse to the current group and append the group to consecutiveGroups
    currentGroup.push(sortedResults[sortedResults.length - 1]);
    consecutiveGroups.push(currentGroup);

    return consecutiveGroups;
}

function getNthElementBookAndChapter(n, results) {
    if (n >= 0 && n < results.length) {
        const nthResult: SearchResult = results[n];
        return [nthResult.metadata.book, nthResult.metadata.chapter];
    }
}

function stitchVerses(results: any[][]) {
    if (results.length == 1) return { id: results[0][0].id, score: results[0][0].score, text: results[0][0].metadata.text };


    let totalScore = 0;
    let stitchedText = '';
    let startVerse = results[0][0].metadata.verse;
    let endVerse = results[results.length - 1][0].metadata.verse;
    let count = 0;

    for (const group of results) {
        for (const result of group) {
            totalScore += result.score;
            stitchedText += result.metadata.text + ' ';
            count++;
        }
    }

    const averageScore = totalScore / count;
    const id = `${results[0][0].metadata.book}_${results[0][0].metadata.chapter}:${startVerse}-${endVerse}`;

    return {
        averageScore,
        id,
        text: stitchedText.trim(),
    };
}

export function givenMatchGetNthResults(n, matches) {
    const [book, chapter] = getNthElementBookAndChapter(n, matches) || [null, null];
    const consecVerses = findConsecutiveVerses(book, chapter, matches);
    return stitchVerses(consecVerses)
}