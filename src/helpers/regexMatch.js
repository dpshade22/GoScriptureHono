import { Pinecone } from '@pinecone-database/pinecone'
import { combineLists } from './mergeVerses';
import { getVectorEmbeddingFromQuery } from '../helpers/openaiAPI';

const bibleBooks = [
    "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
    "Titus", "Philemon", "Hebrews", "James", "1 Peter",
    "2 Peter", "1 John", "2 John", "3 John", "Jude",
    "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
    "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
    "Mark", "Luke", "John", "Acts", "Romans",
    "Revelation",
];

const alternativeBookNames = {
    "Psalm": "Psalms",
    "Pslam": "Psalms",
    "Pslams": "Psalms",
    "Gen": "Genesis",
    "Ex": "Exodus",
    "Lev": "Leviticus",
    "Num": "Numbers",
    "Deut": "Deuteronomy",
    "Josh": "Joshua",
    "Judg": "Judges",
    "Ruth": "Ruth",
    "1 Sam": "1 Samuel",
    "2 Sam": "2 Samuel",
    "1 Ki": "1 Kings",
    "2 Ki": "2 Kings",
    "1 Chr": "1 Chronicles",
    "2 Chr": "2 Chronicles",
    "1Sam": "1 Samuel",
    "2Sam": "2 Samuel",
    "1Ki": "1 Kings",
    "2Ki": "2 Kings",
    "1Chr": "1 Chronicles",
    "2Chr": "2 Chronicles",
    "Ezr": "Ezra",
    "Neh": "Nehemiah",
    "Est": "Esther",
    "Prov": "Proverbs",
    "Eccl": "Ecclesiastes",
    "Song": "Song of Solomon",
    "Isa": "Isaiah",
    "Jer": "Jeremiah",
    "Lam": "Lamentations",
    "Ezek": "Ezekiel",
    "Dan": "Daniel",
    "Hos": "Hosea",
    "Am": "Amos",
    "Ob": "Obadiah",
    "Jon": "Jonah",
    "Mic": "Micah",
    "Nah": "Nahum",
    "Hab": "Habakkuk",
    "Zeph": "Zephaniah",
    "Hag": "Haggai",
    "Zech": "Zechariah",
    "Mal": "Malachi",
    "Matt": "Matthew",
    "Mk": "Mark",
    "Lk": "Luke",
    "Jn": "John",
    "Rom": "Romans",
    "1 Cor": "1 Corinthians",
    "2 Cor": "2 Corinthians",
    "1Cor": "1 Corinthians",
    "2Cor": "2 Corinthians",
    "Gal": "Galatians",
    "Eph": "Ephesians",
    "Phil": "Philippians",
    "Col": "Colossians",
    "1 Thess": "1 Thessalonians",
    "2 Thess": "2 Thessalonians",
    "1 Tim": "1 Timothy",
    "2 Tim": "2 Timothy",
    "1Thess": "1 Thessalonians",
    "2Thess": "2 Thessalonians",
    "1Tim": "1 Timothy",
    "2Tim": "2 Timothy",
    "Tit": "Titus",
    "Phlm": "Philemon",
    "Heb": "Hebrews",
    "Jas": "James",
    "1 Pet": "1 Peter",
    "2 Pet": "2 Peter",
    "1 Jn": "1 John",
    "2 Jn": "2 John",
    "3 Jn": "3 John",
    "1Pet": "1 Peter",
    "2Pet": "2 Peter",
    "1Jn": "1 John",
    "2Jn": "2 John",
    "3Jn": "3 John",
    "Rev": "Revelation",
};

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: 'gcp-starter',
});

export const pineconeDB = pinecone.index('web-bible');


function createBookNameMap() {
    const bookNameMap = {};
    bibleBooks.forEach((book) => {
        bookNameMap[book] = book;
        bookNameMap[book.toLowerCase()] = book;
    });

    for (const alt in alternativeBookNames) {
        const orig = alternativeBookNames[alt];
        bookNameMap[alt] = orig;
        bookNameMap[alt.toLowerCase()] = orig;
    }

    return bookNameMap;
}

const bookNameMap = createBookNameMap();

function isValidBibleBook(input) {
    const normalizedInput = input.toLowerCase();
    const sortedBookNames = Object.keys(bookNameMap).sort((a, b) => b.length - a.length);

    for (const bookName of sortedBookNames) {
        const pattern = ".*" + bookName.split(" ").join(".*");
        const re = new RegExp(pattern);

        if (re.test(normalizedInput)) {
            return [true, bookNameMap[bookName]];
        }
    }

    return [false, ""];
}

export function checkIfUserSearchContainsSpecificVerse(search) {
    const pattern = /([\w\s]+?)(\d+)(?:.*?(\d+))?(?:.*?(\d+))?/;
    const regex = new RegExp(pattern);
    const matches = search.match(regex);

    if (matches && matches.length > 0) {
        const [hasBook, bookName] = isValidBibleBook(matches[1]);
        if (!hasBook) {
            return false;
        }

        const chapter = parseInt(matches[2], 10);
        const verse = parseInt(matches[3], 10);
        const verseEnd = parseInt(matches[4], 10);

        if (bookName && chapter && verse && verseEnd)
            return [true, bookName + '_' + chapter + ':' + verse + '-' + verseEnd];
        else if (bookName && chapter && verse)
            return [true, bookName + '_' + chapter + ':' + verse];
        else if (bookName && chapter)
            return [true, bookName + '_' + chapter];
    }
    return [false, ''];
}

export async function fetchPassage(searchId) {
    try {
        let verseRange = null;
        const originalSearch = searchId

        if (searchId.includes('-')) {
            const regex = /^(.*?):(\d+-\d+)/;
            const match = searchId.match(regex);

            if (match && match.length > 0) {
                searchId = match[1];
                verseRange = match[2];
            }
        }

        const result = await pineconeDB.fetch([searchId]);
        const verseText = result.records[searchId].metadata.verseText;
        const chapterText = result.records[searchId].metadata.chapterText;
        const chapterRange = result.records[searchId].metadata.verseNum;

        if (verseRange) {
            const [_, chapterLength] = chapterRange.split('-').map(Number);
            let [startVerse, endVerse] = verseRange.split('-').map(Number);

            let startIndex = chapterText.indexOf(startVerse);
            let endIndex = chapterText.indexOf(endVerse + 1);
            let passageText = chapterText.slice(startIndex, endIndex).trim();

            console.log(`Query is a passage: ${startVerse}-${endVerse}`);

            if (endIndex === -1) {
                endIndex = chapterText.length;
            }
            if (chapterLength < endVerse) endVerse = chapterLength;


            const passageVectorEmbedding = await getVectorEmbeddingFromQuery(passageText);
            let resp = (await pineconeDB.query({ topK: 500, vector: passageVectorEmbedding, includeMetadata: true })).matches;

            resp = combineLists(resp);
            resp.unshift(
                {
                    id: -1,
                    location: `${searchId.replace(/_/g, ' ')}:${startVerse}-${endVerse}`,
                    similarity: 2,
                    verse: passageText,
                }
            )

            return resp;
        } else {
            console.log('Query is not a passage, rather a verse or chapter');
            let resp = (await pineconeDB.query({ topK: 500, includeMetadata: true, id: searchId })).matches

            resp = combineLists(resp);
            resp[0].location != `${searchId.replace(/_/g, ' ')}` ? resp.unshift({
                id: -1,
                location: `${searchId.replace(/_/g, ' ')}`,
                similarity: 2,
                verse: verseText != -1 ? verseText : chapterText,
            }) : console.log('Resp already contains verse or chapter')

            return resp;
        }

    } catch {
        console.log('Error')
        return false;
    }
}