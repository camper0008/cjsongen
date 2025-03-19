function colorCss(color: string) {
  return `color: ${color};`;
}

function isPrimitive(word: string): boolean {
  return ["char", "int64_t", "bool", "void", "size_t", "true", "false"]
    .includes(
      word,
    ) || !isNaN(parseInt(word));
}

function isComplex(word: string): boolean {
  const isComplex = word.toUpperCase()[0] == word[0] &&
    word.toLowerCase()[0] != word[0];

  return isComplex;
}

function isString(word: string): boolean {
  if (word.startsWith('"') && word.endsWith('"')) return true;
  if (word.startsWith("'") && word.endsWith("'")) return true;
  return false;
}

function isKeyword(word: string): boolean {
  return ["if", "else", "typedef", "struct", "enum", "while", "return"]
    .includes(word);
}

function wordStyle(word: string): string {
  const predicates: [(word: string) => boolean, string][] = [
    [isKeyword, "#fe8019"],
    [isString, "green"],
    [isPrimitive, "#8ec07c"],
    [isComplex, "#cf8693"],
  ];
  for (const [predicate, color] of predicates) {
    if (!predicate(word)) {
      continue;
    }
    return colorCss(color);
  }
  return "";
}

function colorizer(input: string): [string, string[]] {
  let format = "";
  const styles = [];
  const chars = input.split("").toReversed();
  let word = "";
  let stringMode = false;
  while (true) {
    const char = chars.pop();
    if (char === undefined) {
      format += `%c${word}`;
      styles.push(wordStyle(word));
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
    const isSeperator = "*;{}()[] \r\t\n".includes(char);
    if (isSeperator && !stringMode) {
      format += `%c${word}`;
      styles.push(wordStyle(word));
      format += `%c${char}`;
      styles.push("");
      word = "";
      continue;
    }
    word += char;
  }

  return [format, styles];
}

export function colorPrint(input: string) {
  const [format, styles] = colorizer(input);
  return console.log(format, ...styles);
}
