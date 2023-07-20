import dotProp from 'dot-prop';
import { UnknownDictionaryKnownValues } from '../types/common';
import { parseJSON } from '../lib/helpers';

export default class CommandParser {
    static getCommand(message: string, prefix: string): [string | null, boolean] {
        let isDoubleClickable = false;

        if (message.includes('buy_') || message.includes('sell_')) {
            message = this.replaceUnderscores(message);
            isDoubleClickable = true;
        }

        if (
            message.startsWith(prefix) ||
            message.startsWith('sell') ||
            message.startsWith('buy') ||
            isDoubleClickable
        ) {
            if (!message.startsWith(prefix)) {
                const index = message.indexOf(' ');
                return [message.substring(0, index === -1 ? undefined : index), isDoubleClickable];
            }
            return [message.slice(prefix.length).trim().split(/ +/).shift()?.toLowerCase(), isDoubleClickable];
        }

        return [null, isDoubleClickable];
    }

    static removeCommand(message: string): string {
        if (message.includes('_')) {
            message = this.replaceUnderscores(message);
        }

        return message.substring(message.indexOf(' ') + 1);
    }

    static replaceUnderscores(message: string): string {
        return message.replace(/_/g, ' ');
    }

    static replaceSpaces(message: string): string {
        return message.replace(/ /g, '_');
    }

    // The '-' needs to be the first on in the array, to make sure it's not interpreted as "range"
    static exceptionReplaceWithSpace = ['-', '.', ','];
    static exceptionRemove = [':', '#', "'", '!', '?', '%', ';', '(', ')'];

    static replaceExceptions(name: string) {
        name = name.replace(new RegExp('[' + this.exceptionReplaceWithSpace.join('') + ']', 'g'), ' ');
        name = name.replace(new RegExp('[' + this.exceptionRemove.join('') + ']', 'g'), '');

        return name;
    }

    private static normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    private static bold = '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';

    static fromBold(toDecode: string) {
        let decoded = '';

        for (let i = 0; i < toDecode.length; i++) {
            const index = this.bold.indexOf(toDecode[i] + toDecode[i + 1]);

            if (index !== -1) {
                decoded += this.normal[index / 2];
                i++;
            } else {
                decoded += toDecode[i];
            }
        }

        return decoded;
    }

    static toBold(toEncode: string) {
        let encoded = '';

        for (let i = 0; i < toEncode.length; i++) {
            const index = this.normal.indexOf(toEncode[i]) * 2;

            if (index >= 0) {
                encoded += this.bold[index] + this.bold[index + 1];
            } else {
                encoded += toEncode[i];
            }
        }

        return encoded;
    }

    static parseParams(paramString: string): UnknownDictionaryKnownValues {
        const params: UnknownDictionaryKnownValues = parseJSON(
            '{"' + paramString.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}'
        );

        const parsed: UnknownDictionaryKnownValues = {};
        if (params !== null) {
            for (const key in params) {
                if (!Object.prototype.hasOwnProperty.call(params, key)) continue;

                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                let value = params[key];

                if (key !== 'sku') {
                    const lowerCase = (value as string).toLowerCase();
                    if (/^-?\d+$/.test(lowerCase)) {
                        value = parseInt(lowerCase);
                    } else if (/^-?\d+(\.\d+)?$/.test(lowerCase)) {
                        value = parseFloat(lowerCase);
                    } else if (lowerCase === 'true') {
                        value = true;
                    } else if (lowerCase === 'false') {
                        value = false;
                    } else if (typeof value === 'string' && value[0] === '[' && value[value.length - 1] === ']') {
                        if (value.length === 2) {
                            value = [];
                        } else {
                            value = value
                                .slice(1, -1)
                                .split(',')
                                .map(v => v.trim().replace(/["']/g, ''));
                        }
                    }
                }

                dotProp.set(parsed, key.trim(), value);
            }
        }

        return parsed;
    }
}
