function colorCss(color: string) {
    return `color: ${color};`;
}

function isPrimitiveCType(word: string): boolean {
    return ["char", "int64_t", "bool", "void", "size_t", "true", "false"]
        .includes(
            word,
        ) || "0123456789".includes(word[0]);
}

function isCPtr(word: string): boolean {
    const allowed = "*";
    return word.split("").every((c) => allowed.includes(c));
}

function isCSpecialFunction(word: string): boolean {
    return ["assert", "sizeof", "free", "malloc", "sprintf", "snprintf"]
        .includes(word);
}

function isCRef(word: string): boolean {
    const allowed = "&";
    return word.split("").every((c) => allowed.includes(c));
}

function isComplexCType(word: string): boolean {
    const isComplex = word.toUpperCase()[0] == word[0] &&
        word.toLowerCase()[0] != word[0];

    return isComplex;
}

function isSqlKeyword(word: string): boolean {
    return [
        "CREATE",
        "IF",
        "NOT",
        "EXISTS",
        "VALUES",
        "INSERT",
        "INTO",
    ]
        .includes(word);
}

function isString(word: string): boolean {
    if (word.startsWith('"') && word.endsWith('"')) return true;
    if (word.startsWith("'") && word.endsWith("'")) return true;
    return false;
}

function isCLabel(word: string): boolean {
    return word.endsWith(":");
}

function isCKeyword(word: string): boolean {
    return [
        "for",
        "goto",
        "if",
        "else",
        "break",
        "typedef",
        "struct",
        "enum",
        "while",
        "return",
        "continue",
        "const",
    ]
        .includes(word);
}

function wordStyle(word: string, predicates: PredicateList): string {
    for (const [predicate, color] of predicates) {
        if (!predicate(word)) {
            continue;
        }
        return color;
    }
    return "";
}

type PredicateList = [(word: string) => boolean, string][];

type ColorizerOpts = {
    seperatorCharacters: string;
    predicates: PredicateList;
};

function colorizer(
    input: string,
    { seperatorCharacters, predicates }: ColorizerOpts,
): [string, string[]] {
    let format = "";
    const styles = [];
    const chars = input.split("").toReversed();
    let word = "";
    let stringMode = false;
    while (true) {
        const char = chars.pop();
        if (char === undefined) {
            format += `%c${word}`;
            styles.push(wordStyle(word, predicates));
            break;
        }

        if (char === '"' || char === "'") {
            if (stringMode && word[word.length - 1] !== "\\") {
                stringMode = false;
                word += char;
                continue;
            }
            stringMode = true;
            word += char;
            continue;
        }
        const isSeperator = seperatorCharacters.includes(char);
        if (isSeperator && !stringMode) {
            format += `%c${word}`;
            styles.push(wordStyle(word, predicates));
            format += `%c${char}`;
            styles.push(wordStyle(char, predicates));
            word = "";
            continue;
        }
        word += char;
    }

    return [format, styles];
}

export function printSql(input: string, color: boolean) {
    if (!color) {
        return console.log(input.replaceAll("%", "%%"));
    }
    const predicates: PredicateList = [
        [isString, colorCss("green")],
        [isSqlKeyword, colorCss("red")],
    ];

    const [format, styles] = colorizer(input.replaceAll("%", "%%"), {
        seperatorCharacters: "() \r\t\n",
        predicates,
    });
    return console.log(format, ...styles);
}

export function printC(input: string, color: boolean) {
    if (!color) {
        return console.log(input.replaceAll("%", "%%"));
    }
    const predicates: PredicateList = [
        [isCKeyword, colorCss("#fe8019")],
        [isPrimitiveCType, colorCss("#8ec07c")],
        [isComplexCType, colorCss("#cf8693")],
        [isString, colorCss("green")],
        [isCPtr, colorCss("yellow")],
        [isCRef, colorCss("blue")],
        [isCSpecialFunction, colorCss("blue")],
        [isCLabel, colorCss("#8ec07c")],
    ];

    const [format, styles] = colorizer(input.replaceAll("%", "%%"), {
        seperatorCharacters: "->&*,;{}()[] \r\t\n",
        predicates,
    });
    return console.log(format, ...styles);
}
