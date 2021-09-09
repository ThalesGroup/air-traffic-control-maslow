import * as fs from "fs";

export module FileIO {

    export function loadText(textFile) {
        const content = fs.readFileSync(textFile, 'utf8');
        return content;
    }


    export function loadJSONData(jsonFile) {
        try {
            const content = fs.readFileSync(jsonFile, 'utf8');
            const data = JSON.parse(content);
            return data;
        } catch (e) {
            console.log("Error loadJSONData",e)
            return null;
        }
    }

    export function createDirs(path) {
        fs.mkdirSync(path, { recursive: true });
    }

    export async function saveJSONData(path, data, format?: boolean) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, JSON.stringify(data, null, format ? 2 : 0), 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })

    }

    export async function saveText(path, text) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, text, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })

    }

    export function deleteFile(path) {
        try {
            fs.unlinkSync(path);
            return true;
        }catch(e){
            return false;
        }
    }

    export function listFiles(dir) {
        try {
            const files = fs.readdirSync(dir);
            return files;
        }catch(e){
            return [];
        }
    }

    export function exists(file) {
        return fs.existsSync(file);
    }
}