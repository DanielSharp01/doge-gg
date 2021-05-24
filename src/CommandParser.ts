import e from 'express';

export type CustomError = { name: 'custom', [key: string]: any };
export type ParserError<T> =
    {
        name: 'expectWord';
        word: string;
        wordKey?: keyof T,
        missing: boolean;
    } | {
        name: 'choice'
        errors: Array<ParserError<T>>;
    } | {
        name: 'expectUntilWord'
        word: string;
        wordKey?: keyof T,
        key: keyof T;
        missingBetween: boolean
        missing: boolean;
    } | {
        name: 'expectUntilAnyOfWords'
        words?: string[],
        wordKey?: keyof T;
        key: keyof T,
        missingBetween: boolean,
        missing: boolean;
    } | {
        name: 'expectUntilEnd'
        key: keyof T;
    } | {
        name: 'expectAnyOfWords'
        words?: string[],
        wordKey?: keyof T;
        missing: boolean;
    } | {
        name: 'expectAnyWord'
        wordKey: keyof T;
    } | {
        name: 'expectEnded'
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
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectWord', word, wordKey, missing: remaining.trim().length == 0 });
        }
        remaining = rem.join(' ').trim();
        return new CommandParser(remaining, this.parameters).setParameter(wordKey, word as T[keyof T]);
    }

    expectUntilWord(key: keyof T, word: string, caseSensitive?: boolean, wordKey?: keyof T): CommandParser<T> {
        if (this.error) return this;

        let remaining = this.remaining;
        const words = remaining.split(' ');
        const index = words.findIndex(w => wordCase(w, caseSensitive) == wordCase(word, caseSensitive));
        if (index <= 0) {
            return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectUntilWord', key, word, wordKey, missingBetween: index == 0, missing: remaining.trim().length == 0 });
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

    expectEnded(): CommandParser<T> {
        if (!this.error && this.remaining.trim().length > 0) return new CommandParser<T>(this.remaining, this.parameters, { name: 'expectEnded' });
        return this;
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
        })).mapError((e: any) => ({ name: 'expectAnyOfWords', words, wordKey, missing: e.errors.some(e => e.missing) }));
    }

    expectUntilAnyOfWords(key: keyof T, words: string[], caseSensitive?: boolean, wordKey?: keyof T): CommandParser<T> {
        if (this.error) return this;

        return this.choice(...words.map(w => {
            return p => p.expectUntilWord(key, w, caseSensitive, wordKey)
        })).mapError((e: any) => ({ name: 'expectUntilAnyOfWords', words, wordKey, key, missingBetween: e.errors.some(e => e.missingBetween), missing: e.errors.some(e => e.missing) }));
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

    execute(callback: (p: Partial<T>, parser?: CommandParser<T>) => void): CommandParser<T> {
        if (!this.error) callback(this.parameters, this);
        return this;
    }

    executeError(callback: (e: ParserError<T>, p?: Partial<T>, parser?: CommandParser<T>) => void): CommandParser<T> {
        if (this.error) callback(this.error, this.parameters, this);
        return this;
    }

    reparemetrize<R extends { [key: string]: string }>(): CommandParser<R> {
        if (this.error) throw new Error("Can't reparametrize when parser is errored out!");
        return new CommandParser<R>(this.remaining);
    }
}