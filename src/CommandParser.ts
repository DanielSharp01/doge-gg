export type CustomError = { name: 'custom', [key: string]: any };
export type ParserError<T> =
    {
        name: 'expectWord';
        word: string;
        wordKey?: keyof T,
    } | {
        name: 'choice'
        errors: Array<ParserError<T>>;
    } | {
        name: 'expectUntilWord'
        word: string;
        wordKey?: keyof T,
        key: keyof T;
    } | {
        name: 'expectUntilEnd'
        key: keyof T;
    } | {
        name: 'expectAnyOfWords'
        words?: string[],
        wordKey?: keyof T;
    } | {
        name: 'expectAnyWord'
        wordKey: keyof T;
    } | CustomError;

function wordCase(word: string, caseSensitive: boolean): string {
    if (!caseSensitive) {
        word = word.toLowerCase();
    }
    return word.trim();
}

export class CommandParser<T extends { [key: string]: string }> {
    public constructor(
        public readonly remaining: string,
        public readonly parameters: Partial<T> = {},
        public readonly error: ParserError<T> = null,
    ) {
    }

    expectWord(word: string, caseSensitive?: boolean, wordKey?: keyof T): CommandParser<T> {
        if (this.error) return this;

        let remaining = this.remaining;
        const [remWord, ...rem] = remaining.split(' ');
        if (wordCase(remWord, caseSensitive) != wordCase(word, caseSensitive)) {
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectWord', word, wordKey });
        }
        remaining = rem.join(' ').trim();
        return new CommandParser(remaining, this.parameters).setParameter(wordKey, word as T[keyof T]);
    }

    expectUntilWord(key: keyof T, word: string, caseSensitive?: boolean, wordKey?: keyof T): CommandParser<T> {
        if (this.error) return this;

        let remaining = this.remaining;
        const words = remaining.split(' ');
        const index = words.findIndex(w => wordCase(w, caseSensitive) == wordCase(word, caseSensitive));
        if (index == -1) {
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectUntilWord', key, word, wordKey });
        }

        const value = words.slice(0, index).join(' ');
        remaining = words.slice(index + 1).join(' ');
        return new CommandParser(remaining.trim(), this.parameters)
            .setParameter(key, value as T[keyof T])
            .setParameter(wordKey, words[index] as T[keyof T]);
    }

    expectUntilEnd(key: keyof T): CommandParser<T> {
        if (this.error) return this;

        if (this.remaining.trim().length == 0) {
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectUntilEnd', key });
        }

        return new CommandParser('', this.parameters)
            .setParameter(key, this.remaining as T[keyof T]);
    }

    optionalUntilEnd(key: keyof T): CommandParser<T> {
        if (this.error) return this;

        return new CommandParser('', this.parameters)
            .setParameter(key, (this.remaining || null) as T[keyof T]);
    }

    expectAnyWord(wordKey: keyof T): CommandParser<T> {
        if (this.error) return this;

        let remaining = this.remaining;
        let [remWord, ...rem] = remaining.split(' ');
        if (remWord?.trim()?.length == 0) {
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectAnyWord', wordKey });
        }
        remaining = rem.join(' ').trim();
        return new CommandParser(remaining, this.parameters).setParameter(wordKey, remWord as T[keyof T]);
    }

    expectAnyOfWords(words: string[], caseSensitive?: boolean, wordKey?: keyof T): CommandParser<T> {
        if (this.error) return this;

        return this.choice(...words.map(w => {
            return p => p.expectWord(w, caseSensitive, wordKey)
        })).mapError(() => ({ name: 'expectAnyOfWords', words, wordKey }));
    }

    choice(...parsings: Array<(p: CommandParser<T>) => CommandParser<T>>): CommandParser<T> {
        if (this.error) return this;

        const parserErrors = [];
        for (const parsing of parsings) {
            const parser = parsing(this);
            if (!parser.error) {
                return parser;
            } else {
                parserErrors.push(parser.error);
            }
        }
        return new CommandParser<T>(this.remaining, this.parameters, { name: 'choice', errors: parserErrors });
    }

    setParameter<V extends T[keyof T]>(key: keyof T, value: V): CommandParser<T> {
        if (this.error) return this;
        if (!key) return this;

        const newParamerers = { ...this.parameters };
        newParamerers[key] = value;
        return new CommandParser<T>(this.remaining, newParamerers);
    }

    mapError(mapper: (err: ParserError<T>) => ParserError<T>): CommandParser<T> {
        if (this.error) return new CommandParser(this.remaining, this.parameters, mapper(this.error));
        else return this;
    }
}