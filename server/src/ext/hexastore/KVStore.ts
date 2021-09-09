import levelup from 'levelup';
import encode from 'encoding-down';
import fs from 'fs'

const DEFAULT_PATH = './hexastore/db'

export class KVStore {

    db: any;

    constructor(storage, path?: string) {
        const dbPath = path ? path : DEFAULT_PATH;
        fs.mkdirSync(dbPath, { recursive: true });
        var customEncoding = {
            encode: JSON.stringify,
            decode: JSON.parse,
            buffer: false,
            type: 'custom'
        }

        const options = {
            keyEncoding: customEncoding,
            valueEncoding: customEncoding,
            keyAsBuffer: false,
            valueAsBuffer: false
        }
        this.db = levelup(encode(storage(dbPath), options))
    }

    async put(key: string, value: any) {
        return new Promise((resolve, reject) => {
            this.db.put(key, value, function (err) {
                if (err) {
                    reject();
                } else {
                    resolve();
                }
            })
        });
    }

    async get(key: string) {
        return new Promise((resolve, reject) => {
            this.db.get(key, function (err, value) {
                if (err) {
                    reject();
                } else {
                    resolve(value);
                }
            });
        });
    }

    async getKeyRange(start: string, end?: string) {
        const endKey = end ? end : start;
        return await this.query({
            gte: `${start}`,
            lte: `${endKey}\xff`
        });
    }

    async getValuesForKeyRange(start: string, end?: string) {
        const endKey = end ? end : start;
        return await this.query({
            gte: `${start}`,
            lte: `${endKey}\xff`,
            keys: false,
            values: true
        });
    }

    async drop() {
        return await this.db.clear();
    }

    async close() {
        return this.db.close();
    }

    // options 
    // gt, gte, lt, lte, reverse, limit, keys:boolean, values: boolean
    async query(options?) {
        return new Promise<any[]>((resolve, reject) => {
            const results = [];
            this.db.createReadStream(options)
                .on('data', function (data) {
                    // console.log(data.key, '=', data.value);
                    results.push(data)
                })
                .on('error', function (err) {
                    // console.log('Oh my!', err)
                    reject(err);
                })
                .on('close', function () {
                    // console.log('Stream closed')
                })
                .on('end', function () {
                    // console.log('Stream ended')
                    resolve(results);
                })
        })
    }
}