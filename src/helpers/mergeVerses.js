function combineVerses(verses) {
    const sortedVerses = sortVersesByIndex(verses);
    return groupConsecutiveVerses(sortedVerses);
}

function sortVersesByIndex(verses) {
    return verses.sort((a, b) => a.metadata.index - b.metadata.index);
}

function groupConsecutiveVerses(verses) {
    const combinedVerses = [];
    let currentGroup = [verses[0]];

    for (let i = 1; i < verses.length; i++) {
        const prevVerse = verses[i - 1];
        const currentVerse = verses[i];

        if (
            currentVerse.metadata.index - prevVerse.metadata.index === 1 &&
            currentVerse.metadata.chapter === prevVerse.metadata.chapter &&
            currentVerse.metadata.bookName === prevVerse.metadata.bookName
        ) {
            currentGroup.push(currentVerse);
        } else {
            combinedVerses.push(currentGroup);
            currentGroup = [currentVerse];
        }
    }

    combinedVerses.push(currentGroup);
    return combinedVerses;
}

export function combineLists(inputList) {
    inputList = combineVerses(inputList);
    return inputList
        .map(createCombinedListItem)
        .sort((a, b) => b.similarity - a.similarity);
}

function createCombinedListItem(subList) {
    const index = subList[0].metadata.index;
    const combinedLocation = formatLocation(subList);
    const combinedSimilarity = calculateSimilarity(subList);
    const combinedText = formatText(subList);

    return {
        id: index,
        location: combinedLocation,
        similarity: combinedSimilarity,
        verse: combinedText,
    };
}

export function formatLocation(subList) {
    const firstItem = subList[0];
    const location = !firstItem.metadata.isChapter ? `${firstItem.metadata.bookName} ${firstItem.metadata.chapter}:${firstItem.metadata.verseNum}` : `${firstItem.metadata.bookName} ${firstItem.metadata.chapter}`;

    if (subList.length > 1) {
        const lastItem = subList[subList.length - 1];
        return `${location}-${lastItem.metadata.verseNum}`.replace(/_/g, ' ');
    }

    return location.replace(/_/g, ' ');
}

function calculateSimilarity(subList) {
    return subList.reduce((acc, item) => acc + item.score, 0) / subList.length;
}

function formatText(subList) {
    if (subList.length > 1) {
        return subList
            .map(item => `${item.metadata.verseNum} ${item.metadata.verseText}`)
            .join(' ')
            .replace(/\\/g, '')
            .trim();
    }

    const firstItem = subList[0];
    return !firstItem.metadata.isChapter
        ? firstItem.metadata.verseText
        : firstItem.metadata.chapterText;
}

